<?php

namespace App\Models;

use App\Traits\UsesCustomId;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use UsesCustomId;

    public $idPrefix = 'TRX';
    public $idLength = 20;
    protected $primaryKey = 'trx_id';

    protected $fillable = [
        'user_id',
        'product_id',
        'user_game_id',
        'zone_id',
        'amount',
        'discount_amount',
        'voucher_code',
        'payment_method',
        'midtrans_transaction_id',
        'digiflazz_ref_id',
        'status',
        'status_note',
        'needs_manual_refund',
        'manual_refund_completed_at',
        'reconciliation_attempts',
        'last_reconciliation_at',
        'needs_reconciliation_review',
        'guest_email',
        'idempotency_key'
    ];

    protected $casts = [
        'needs_manual_refund' => 'boolean',
        'needs_reconciliation_review' => 'boolean',
        'manual_refund_completed_at' => 'datetime',
        'last_reconciliation_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function complaint()
    {
        return $this->hasOne(Complaint::class, 'trx_id', 'trx_id');
    }
}