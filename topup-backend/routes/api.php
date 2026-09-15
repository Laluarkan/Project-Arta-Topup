<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\TransactionController as AdminTransactionController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\PromoController as AdminPromoController;
use App\Http\Controllers\Api\Admin\TicketController as AdminTicketController;
use App\Http\Controllers\Api\Admin\AuditLogController as AdminAuditLogController;
use App\Http\Controllers\Api\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\MidtransWebhookController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\DigiflazzWebhookController;
use App\Http\Controllers\Api\PromoController;
use App\Http\Controllers\Api\DigiflazzController;
use App\Http\Controllers\Api\GameInquiryController;
use App\Http\Controllers\Api\PakasirWebhookController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\Admin\WalletTopupController;
use App\Services\DigiflazzService;
use Illuminate\Support\Facades\Schema;

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    Route::post('/email/resend-public', [AuthController::class, 'resendVerificationPublic']);
});

Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('verification.verify');

Route::middleware('throttle:60,1')->group(function () {
    Route::post('/webhook/midtrans', [MidtransWebhookController::class, 'handleWebhook']);
    Route::post('/webhook/pakasir', [PakasirWebhookController::class, 'handleWebhook']);
    Route::post('/webhook/digiflazz', [DigiflazzWebhookController::class, 'handleWebhook']); 

    Route::get('/categories', [CatalogController::class, 'getCategories']);
    Route::get('/payment-gateways/status', [CatalogController::class, 'getActivePaymentGateways']);
    Route::get('/products/{category}', [CatalogController::class, 'getProductsByCategory']);
    Route::get('/trending-games', [CatalogController::class, 'getTrendingGames']);

    Route::get('/promos', [PromoController::class, 'index']);
    Route::post('/promos/validate', [PromoController::class, 'validateCode']);
    
    Route::post('/check-nickname', [GameInquiryController::class, 'check']);
});

if (app()->environment('local')) {
    Route::middleware(['auth:sanctum', 'role:super-admin'])->get('/dev/wipe-and-sync', function () {
        Schema::disableForeignKeyConstraints();
        \App\Models\Product::truncate();
        \App\Models\Category::truncate();
        \App\Models\Provider::truncate();
        Schema::enableForeignKeyConstraints();
        $service = new DigiflazzService();
        return $service->syncProducts();
    });
}

Route::middleware('throttle:20,1')->group(function () {
    Route::post('/checkout/midtrans', [TransactionController::class, 'checkoutMidtrans']);
    Route::post('/checkout/pakasir', [TransactionController::class, 'checkoutPakasir'])->middleware('throttle:10,1');
    Route::get('/transactions/{trx_id}', [TransactionController::class, 'show']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/resend', [AuthController::class, 'resendVerificationEmail']);
    
    Route::get('/user', function (Request $request) {
        return $request->user()->load('roles');
    });

    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    
    Route::get('/user/tickets', [TicketController::class, 'index']);
    Route::post('/user/tickets', [TicketController::class, 'store']);

    Route::get('/user/transactions', [TransactionController::class, 'getUserTransactions']);
    
    Route::middleware('throttle:10,1')->post('/checkout/wallet', [TransactionController::class, 'checkoutWallet']);

    // Wallet: riwayat & top up saldo
    Route::get('/user/wallet-transactions', [WalletController::class, 'history']);
    Route::get('/wallet/manual-transfer-info', [WalletController::class, 'manualTransferInfo']);
    Route::get('/wallet/topup/{id}', [WalletController::class, 'show']);
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/wallet/topup/midtrans', [WalletController::class, 'topupMidtrans']);
        Route::post('/wallet/topup/pakasir', [WalletController::class, 'topupPakasir']);
        Route::post('/wallet/topup/manual', [WalletController::class, 'topupManual']);
    });

    Route::middleware(['role:super-admin|admin'])->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);

        Route::get('/wallet-topups', [WalletTopupController::class, 'index']);
        Route::post('/wallet-topups/{id}/approve', [WalletTopupController::class, 'approve']);
        Route::post('/wallet-topups/{id}/reject', [WalletTopupController::class, 'reject']);
        
        Route::get('/categories', [AdminCategoryController::class, 'index']);
        Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
        Route::post('/categories/auto-fetch-logos', [AdminCategoryController::class, 'autoFetchLogos']);
        Route::post('/categories/{id}/upload-icon', [AdminCategoryController::class, 'uploadIcon']);
        Route::post('/categories/migrate-external-icons', [AdminCategoryController::class, 'migrateExternalIcons']);

        Route::get('/products', [AdminProductController::class, 'index']);
        Route::put('/products/{id}', [AdminProductController::class, 'update']);
        Route::post('/sync-products', [AdminProductController::class, 'syncProducts']);

        Route::get('/transactions', [AdminTransactionController::class, 'index']);
        Route::put('/transactions/{id}/status', [AdminTransactionController::class, 'updateStatus']);
        Route::post('/transactions/{id}/retry', [AdminTransactionController::class, 'retryTopup']);
        Route::post('/transactions/{id}/mark-refunded', [AdminTransactionController::class, 'markManualRefundDone']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::put('/users/{id}', [AdminUserController::class, 'update']);

        Route::get('/promos', [AdminPromoController::class, 'index']);
        Route::post('/promos', [AdminPromoController::class, 'store']);
        Route::put('/promos/{id}', [AdminPromoController::class, 'update']);
        Route::delete('/promos/{id}', [AdminPromoController::class, 'destroy']);

        Route::get('/tickets', [AdminTicketController::class, 'index']);
        Route::put('/tickets/{id}/status', [AdminTicketController::class, 'updateStatus']);

        Route::get('/audit-logs', [AdminAuditLogController::class, 'index']);

        Route::get('/settings', [AdminSettingController::class, 'index']);
        Route::post('/settings', [AdminSettingController::class, 'store']);

        Route::post('/digiflazz/sync', [DigiflazzController::class, 'sync']);
    });
});