<?php

namespace Tests\Feature\Webhooks;

use App\Models\Category;
use App\Models\Product;
use App\Models\Provider;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WalletTopup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PakasirWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // PakasirService baca config('services.pakasir.*'), bukan env() langsung,
        // jadi kita set lewat config() supaya konsisten walau config sempat di-cache.
        config([
            'services.pakasir.slug' => 'test-project-slug',
            'services.pakasir.api_key' => 'test-api-key',
        ]);
    }

    /** @test */
    public function menolak_jika_verifikasi_ulang_ke_pakasir_gagal()
    {
        // Pakasir tidak menandatangani webhook-nya, jadi setiap webhook masuk WAJIB
        // di-double-check ke Transaction Detail API. Simulasikan Pakasir bilang
        // transaksi ini TIDAK completed (berbeda dari klaim webhook), harus ditolak.
        Http::fake([
            'app.pakasir.com/api/transactiondetail*' => Http::response([
                'transaction' => ['status' => 'pending'],
            ], 200),
        ]);

        $user = User::factory()->create(['balance' => 0]);
        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => 30000,
            'payment_method' => 'pakasir',
            'status' => 'PENDING',
        ]);

        $response = $this->postJson('/api/webhook/pakasir', [
            'order_id' => $topup->id,
            'amount' => 30000,
            'status' => 'completed',
        ]);

        $response->assertStatus(202);
        $this->assertSame('PENDING', $topup->fresh()->status);
        $this->assertSame(0.0, (float) $user->fresh()->balance);
    }

    /** @test */
    public function menambah_saldo_wallet_setelah_verifikasi_pakasir_berhasil()
    {
        Http::fake([
            'app.pakasir.com/api/transactiondetail*' => Http::response([
                'transaction' => ['status' => 'completed'],
            ], 200),
        ]);

        $user = User::factory()->create(['balance' => 10000]);
        $topup = WalletTopup::create([
            'user_id' => $user->id,
            'amount' => 30000,
            'payment_method' => 'pakasir',
            'status' => 'PENDING',
        ]);

        $response = $this->postJson('/api/webhook/pakasir', [
            'order_id' => $topup->id,
            'amount' => 30000,
            'status' => 'completed',
        ]);

        $response->assertStatus(200);
        $this->assertSame('PAID', $topup->fresh()->status);
        $this->assertSame(40000.0, (float) $user->fresh()->balance);
    }

    /** @test */
    public function menolak_jika_nominal_yang_dikirim_tidak_cocok()
    {
        Http::fake([
            'app.pakasir.com/api/transactiondetail*' => Http::response([
                'transaction' => ['status' => 'completed'],
            ], 200),
        ]);

        $category = Category::create(['name' => 'Valorant']);
        $provider = Provider::create(['name' => 'Digiflazz']);
        $product = Product::create([
            'category_id' => $category->id,
            'provider_id' => $provider->id,
            'buyer_sku_code' => 'VP-475',
            'product_name' => '475 VP',
            'price_member' => 75000,
            'price_reseller' => 70000,
            'provider_price' => 65000,
        ]);
        $transaction = Transaction::create([
            'product_id' => $product->id,
            'user_game_id' => 'player#1234',
            'amount' => 75000,
            'payment_method' => 'qris',
            'digiflazz_ref_id' => 'REF-' . uniqid(),
            'status' => 'PENDING',
        ]);

        // Nominal yang "dibayar" cuma 1000, jauh di bawah harga produk asli (75000).
        $response = $this->postJson('/api/webhook/pakasir', [
            'order_id' => $transaction->trx_id,
            'amount' => 1000,
            'status' => 'completed',
        ]);

        $response->assertStatus(400);
        $this->assertSame('PENDING', $transaction->fresh()->status);
    }

    /** @test */
    public function transaksi_yang_sudah_paid_tidak_diproses_ulang()
    {
        Queue::fake();
        Http::fake([
            'app.pakasir.com/api/transactiondetail*' => Http::response([
                'transaction' => ['status' => 'completed'],
            ], 200),
        ]);

        $category = Category::create(['name' => 'PUBG Mobile']);
        $provider = Provider::create(['name' => 'Digiflazz']);
        $product = Product::create([
            'category_id' => $category->id,
            'provider_id' => $provider->id,
            'buyer_sku_code' => 'PUBG-60',
            'product_name' => '60 UC',
            'price_member' => 15000,
            'price_reseller' => 14000,
            'provider_price' => 13000,
        ]);
        $transaction = Transaction::create([
            'product_id' => $product->id,
            'user_game_id' => '5551234567',
            'amount' => 15000,
            'payment_method' => 'qris',
            'digiflazz_ref_id' => 'REF-' . uniqid(),
            'status' => 'PAID', // sudah PAID dari webhook sebelumnya
        ]);

        $response = $this->postJson('/api/webhook/pakasir', [
            'order_id' => $transaction->trx_id,
            'amount' => 15000,
            'status' => 'completed',
        ]);

        $response->assertStatus(200);
        Queue::assertNotPushed(\App\Jobs\ProcessTopupJob::class);
    }
}