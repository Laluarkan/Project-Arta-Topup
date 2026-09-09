<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PakasirService
{
    protected string $baseUrl = 'https://app.pakasir.com/api';
    protected string $slug;
    protected string $apiKey;

    public function __construct()
    {
        $this->slug = config('services.pakasir.slug');
        $this->apiKey = config('services.pakasir.api_key');
    }

    /**
     * Membuat transaksi baru di Pakasir.
     * $method: qris | bni_va | bri_va | cimb_niaga_va | maybank_va | permata_va | bnc_va | atm_bersama_va | sampoerna_va | artha_graha_va
     */
    public function createTransaction(string $orderId, float $amount, string $method = 'qris'): ?array
    {
        try {
            $response = Http::post("{$this->baseUrl}/transactioncreate/{$method}", [
                'project' => $this->slug,
                'order_id' => $orderId,
                'amount' => $amount,
                'api_key' => $this->apiKey,
            ]);

            if ($response->failed()) {
                Log::error('Pakasir createTransaction gagal', ['response' => $response->body()]);
                return null;
            }

            return $response->json('payment');
        } catch (\Exception $e) {
            Log::error('Pakasir createTransaction exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Ambil detail status transaksi langsung dari server Pakasir.
     * WAJIB dipakai untuk double-check setiap webhook masuk,
     * karena Pakasir TIDAK menandatangani webhook-nya dengan signature apa pun.
     */
    public function getTransactionDetail(string $orderId, float $amount): ?array
    {
        try {
            $response = Http::get("{$this->baseUrl}/transactiondetail", [
                'project' => $this->slug,
                'order_id' => $orderId,
                'amount' => $amount,
                'api_key' => $this->apiKey,
            ]);

            if ($response->failed()) {
                Log::error('Pakasir getTransactionDetail gagal', ['response' => $response->body()]);
                return null;
            }

            return $response->json('transaction');
        } catch (\Exception $e) {
            Log::error('Pakasir getTransactionDetail exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Membatalkan transaksi pending.
     */
    public function cancelTransaction(string $orderId, float $amount): ?array
    {
        try {
            $response = Http::post("{$this->baseUrl}/transactioncancel", [
                'project' => $this->slug,
                'order_id' => $orderId,
                'amount' => $amount,
                'api_key' => $this->apiKey,
            ]);

            return $response->failed() ? null : $response->json();
        } catch (\Exception $e) {
            Log::error('Pakasir cancelTransaction exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Simulasi pembayaran sukses — HANYA jalan kalau project masih mode Sandbox di dashboard Pakasir.
     * Berguna untuk testing webhook tanpa transfer uang asli.
     */
    public function simulatePayment(string $orderId, float $amount): ?array
    {
        try {
            $response = Http::post("{$this->baseUrl}/paymentsimulation", [
                'project' => $this->slug,
                'order_id' => $orderId,
                'amount' => $amount,
                'api_key' => $this->apiKey,
            ]);

            return $response->failed() ? null : $response->json();
        } catch (\Exception $e) {
            Log::error('Pakasir simulatePayment exception', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Generate URL redirect langsung ke halaman pembayaran Pakasir tanpa panggil API.
     */
    public function buildPaymentUrl(string $orderId, float $amount, ?string $redirectUrl = null, bool $qrisOnly = false): string
    {
        $url = "https://app.pakasir.com/pay/{$this->slug}/{$amount}?order_id={$orderId}";

        if ($redirectUrl) {
            $url .= '&redirect=' . urlencode($redirectUrl);
        }

        if ($qrisOnly) {
            $url .= '&qris_only=1';
        }

        return $url;
    }
}