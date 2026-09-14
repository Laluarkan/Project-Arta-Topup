<?php

namespace Tests\Feature\Webhooks;

use App\Models\Category;
use App\Models\Product;
use App\Models\Provider;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTopup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class MidtransWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // api_mode default = development, jadi controller baca MIDTRANS_SERVER_KEY_DEV.
        // Kita override langsung di sini (bukan andalkan isi .env) supaya test ini
        // deterministik di mesin siapa pun, termasuk di CI.
        putenv('MIDTRANS_SERVER_KEY_DEV=test-server-key-dev');
        $_ENV['MIDTRANS_SERVER_KEY_DEV'] = 'test-server-key-dev';
    }

    protected function tearDown(): void
    {
        putenv('MIDTRANS_SERVER_KEY_DEV');
        unset($_ENV['MIDTRANS_SERVER_KEY_DEV']);
        parent::tearDown();
    }

    private function signature(string $orderId, string $statusCode, string $grossAmount): string
    {
        return hash('sha512', $orderId . $statusCode . $grossAmount . 'test-server-key-dev');
    }

    /** @test */
    public function menolak_webhook_dengan_signature_tidak_valid()
    {
        $user = User::factory()->create(['balance' => 0]);
        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => 50000,
            'payment_method' => 'midtrans',
            'status' => 'PENDING',
        ]);

        $response = $this->postJson('/api/webhook/midtrans', [
            'order_id' => $topup->id,
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'signature_key' => 'signature-palsu-asal-asalan',
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
        ]);

        // Midtrans mengharapkan HTTP 200 walau ditolak (supaya tidak retry terus-menerus),
        // tapi status topup TIDAK BOLEH berubah dan saldo TIDAK BOLEH bertambah.
        $response->assertStatus(200);
        $this->assertSame('PENDING', $topup->fresh()->status);
        $this->assertSame(0.0, (float) $user->fresh()->balance);
    }

    /** @test */
    public function menambah_saldo_wallet_saat_signature_valid_dan_status_settlement()
    {
        $user = User::factory()->create(['balance' => 10000]);
        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => 50000,
            'payment_method' => 'midtrans',
            'status' => 'PENDING',
        ]);

        $payload = [
            'order_id' => $topup->id,
            'status_code' => '200',
            'gross_amount' => '50000.00',
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
        ];
        $payload['signature_key'] = $this->signature($payload['order_id'], $payload['status_code'], $payload['gross_amount']);

        $response = $this->postJson('/api/webhook/midtrans', $payload);

        $response->assertStatus(200);
        $this->assertSame('PAID', $topup->fresh()->status);
        $this->assertSame(60000.0, (float) $user->fresh()->balance);
    }

    /** @test */
    public function webhook_duplikat_tidak_menambah_saldo_dua_kali()
    {
        $user = User::factory()->create(['balance' => 0]);
        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => 25000,
            'payment_method' => 'midtrans',
            'status' => 'PENDING',
        ]);

        $payload = [
            'order_id' => $topup->id,
            'status_code' => '200',
            'gross_amount' => '25000.00',
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
        ];
        $payload['signature_key'] = $this->signature($payload['order_id'], $payload['status_code'], $payload['gross_amount']);

        // Kirim webhook yang SAMA dua kali (skenario nyata: Midtrans retry karena timeout)
        $this->postJson('/api/webhook/midtrans', $payload)->assertStatus(200);
        $this->postJson('/api/webhook/midtrans', $payload)->assertStatus(200);

        $this->assertSame(25000.0, (float) $user->fresh()->balance, 'Saldo tidak boleh bertambah dua kali dari webhook duplikat.');
    }

    /** @test */
    public function menandai_transaksi_produk_paid_dan_mengantre_job_topup()
    {
        Queue::fake();

        $category = Category::create(['name' => 'Mobile Legends']);
        $provider = Provider::create(['name' => 'Digiflazz']);
        $product = Product::create([
            'category_id' => $category->id,
            'provider_id' => $provider->id,
            'buyer_sku_code' => 'ML-86',
            'product_name' => '86 Diamonds',
            'price_member' => 20000,
            'price_reseller' => 19000,
            'provider_price' => 18000,
        ]);

        $transaction = Transaction::create([
            'product_id' => $product->id,
            'user_game_id' => '123456789',
            'amount' => 20000,
            'payment_method' => 'qris',
            'digiflazz_ref_id' => 'REF-' . uniqid(),
            'status' => 'PENDING',
        ]);

        $payload = [
            'order_id' => $transaction->trx_id,
            'status_code' => '200',
            'gross_amount' => '20000.00',
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
        ];
        $payload['signature_key'] = $this->signature($payload['order_id'], $payload['status_code'], $payload['gross_amount']);

        $this->postJson('/api/webhook/midtrans', $payload)->assertStatus(200);

        $this->assertSame('PAID', $transaction->fresh()->status);
        Queue::assertPushed(\App\Jobs\ProcessTopupJob::class);
    }

    /** @test */
    public function mengembalikan_500_jika_server_key_kosong()
    {
        // Simulasikan skenario nyata: env belum diset di server produksi.
        putenv('MIDTRANS_SERVER_KEY_DEV');
        unset($_ENV['MIDTRANS_SERVER_KEY_DEV']);
        putenv('MIDTRANS_SERVER_KEY');
        unset($_ENV['MIDTRANS_SERVER_KEY']);

        $response = $this->postJson('/api/webhook/midtrans', [
            'order_id' => 'WTP-doesnotmatter',
            'status_code' => '200',
            'gross_amount' => '1000.00',
            'signature_key' => 'apapun',
            'transaction_status' => 'settlement',
            'fraud_status' => 'accept',
        ]);

        $response->assertStatus(500);
    }
}