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
        'guest_email',
        'idempotency_key'
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