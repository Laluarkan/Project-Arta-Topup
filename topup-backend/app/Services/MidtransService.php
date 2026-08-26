<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Setting;

class MidtransService
{
    public function createSnapToken($transaction, $user)
    {
        $dbMode = Setting::where('key', 'api_mode')->value('value');
        $apiMode = $dbMode ?? (env('APP_ENV') === 'production' ? 'production' : 'development');
        $isProduction = $apiMode === 'production';
        
        $serverKey = $isProduction 
            ? env('MIDTRANS_SERVER_KEY_PROD', env('MIDTRANS_SERVER_KEY')) 
            : env('MIDTRANS_SERVER_KEY_DEV', env('MIDTRANS_SERVER_KEY'));
            
        $baseUrl = $isProduction 
            ? 'https://app.midtrans.com/snap/v1/transactions' 
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

        $payload = [
            'transaction_details' => [
                'order_id' => $transaction->trx_id,
                'gross_amount' => (int) $transaction->amount,
            ],
            'customer_details' => [
                'first_name' => $user ? $user->name : 'Pelanggan ArTa Zone',
                'email' => $transaction->guest_email ?? ($user ? $user->email : 'guest@artazone.com'),
                'phone' => ($user && $user->phone) ? $user->phone : '080000000000',
            ],
            'item_details' => [
                [
                    'id' => (string) $transaction->product_id,
                    'price' => (int) $transaction->amount,
                    'quantity' => 1,
                    'name' => substr($transaction->product->product_name, 0, 50),
                ]
            ]
        ];

        $response = Http::withBasicAuth($serverKey, '')
            ->post($baseUrl, $payload);

        if ($response->successful()) {
            return $response->json('token');
        }

        Log::error('Midtrans Snap Error: ' . $response->body());
        return null;
    }
}