<?php

namespace Tests\Feature\Webhooks;

use App\Models\Category;
use App\Models\Product;
use App\Models\Provider;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class DigiflazzWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        putenv('DIGIFLAZZ_WEBHOOK_SECRET_DEV=test-digiflazz-secret');
        $_ENV['DIGIFLAZZ_WEBHOOK_SECRET_DEV'] = 'test-digiflazz-secret';
    }

    protected function tearDown(): void
    {
        putenv('DIGIFLAZZ_WEBHOOK_SECRET_DEV');
        unset($_ENV['DIGIFLAZZ_WEBHOOK_SECRET_DEV']);
        parent::tearDown();
    }

    private function makeTransaction(array $overrides = []): Transaction
    {
        $category = Category::create(['name' => 'Free Fire']);
        $provider = Provider::create(['name' => 'Digiflazz']);
        $product = Product::create([
            'category_id' => $category->id,
            'provider_id' => $provider->id,
            'buyer_sku_code' => 'FF-100',
            'product_name' => '100 Diamonds',
            'price_member' => 15000,
            'price_reseller' => 14000,
            'provider_price' => 13000,
        ]);

        return Transaction::create(array_merge([
            'product_id' => $product->id,
            'user_game_id' => '987654321',
            'amount' => 15000,
            'payment_method' => 'qris',
            'digiflazz_ref_id' => 'REF-' . uniqid(),
            'status' => 'PAID',
        ], $overrides));
    }

    private function signedPost(array $payload)
    {
        $content = json_encode($payload);
        $signature = 'sha1=' . hash_hmac('sha1', $content, 'test-digiflazz-secret');

        $server = $this->transformHeadersToServerVars([
            'X-Hub-Signature' => $signature,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ]);

        return $this->call('POST', '/api/webhook/digiflazz', [], [], [], $server, $content);
    }

    /** @test */
    public function menolak_signature_yang_tidak_cocok()
    {
        $transaction = $this->makeTransaction(['status' => 'PAID']);

        $content = json_encode(['data' => ['ref_id' => $transaction->digiflazz_ref_id, 'status' => 'Sukses']]);
        $server = $this->transformHeadersToServerVars([
            'X-Hub-Signature' => 'sha1=signature-ngasal',
            'Content-Type' => 'application/json',
        ]);

        $response = $this->call('POST', '/api/webhook/digiflazz', [], [], [], $server, $content);

        $response->assertStatus(403);
        $this->assertSame('PAID', $transaction->fresh()->status);
    }

    /** @test */
    public function menandai_transaksi_sukses_dan_mengirim_email_saat_status_sukses()
    {
        Mail::fake();

        $transaction = $this->makeTransaction(['status' => 'PAID', 'guest_email' => 'pembeli@example.com']);

        $response = $this->signedPost([
            'data' => ['ref_id' => $transaction->digiflazz_ref_id, 'status' => 'Sukses'],
        ]);

        $response->assertStatus(200);
        $this->assertSame('SUCCESS', $transaction->fresh()->status);
        Mail::assertQueued(\App\Mail\TransactionSuccessMail::class);
    }

    /** @test */
    public function mengembalikan_saldo_wallet_otomatis_saat_topup_gagal_dan_bayar_pakai_saldo()
    {
        $user = User::factory()->create(['balance' => 5000]);
        $transaction = $this->makeTransaction([
            'status' => 'PAID',
            'payment_method' => 'wallet',
            'user_id' => $user->id,
        ]);

        $response = $this->signedPost([
            'data' => ['ref_id' => $transaction->digiflazz_ref_id, 'status' => 'Gagal'],
        ]);

        $response->assertStatus(200);
        $this->assertSame('FAILED', $transaction->fresh()->status);
        // Saldo dikembalikan: 5000 (sisa) + 15000 (harga produk yang gagal) = 20000
        $this->assertSame(20000.0, (float) $user->fresh()->balance);
    }

    /** @test */
    public function mencoba_refund_via_midtrans_saat_topup_gagal_dan_bayar_bukan_pakai_saldo()
    {
        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response(['status_message' => 'Refund berhasil'], 200),
        ]);
        putenv('MIDTRANS_SERVER_KEY_DEV=test-server-key-dev');
        $_ENV['MIDTRANS_SERVER_KEY_DEV'] = 'test-server-key-dev';

        $transaction = $this->makeTransaction(['status' => 'PAID', 'payment_method' => 'qris']);

        $response = $this->signedPost([
            'data' => ['ref_id' => $transaction->digiflazz_ref_id, 'status' => 'Gagal'],
        ]);

        $response->assertStatus(200);
        $this->assertSame('FAILED', $transaction->fresh()->status);
        Http::assertSent(function ($request) use ($transaction) {
            return str_contains($request->url(), "{$transaction->trx_id}/refund");
        });

        putenv('MIDTRANS_SERVER_KEY_DEV');
        unset($_ENV['MIDTRANS_SERVER_KEY_DEV']);
    }

    /** @test */
    public function tidak_memproses_ulang_transaksi_yang_statusnya_sudah_final()
    {
        Mail::fake();
        $transaction = $this->makeTransaction(['status' => 'SUCCESS']);

        $response = $this->signedPost([
            'data' => ['ref_id' => $transaction->digiflazz_ref_id, 'status' => 'Sukses'],
        ]);

        $response->assertStatus(200);
        // Sudah SUCCESS sebelumnya, kode hanya memproses jika status BUKAN SUCCESS/FAILED,
        // jadi tidak boleh ada email baru terkirim lagi.
        Mail::assertNotQueued(\App\Mail\TransactionSuccessMail::class);
    }
}