<?php

namespace App\Models;

use App\Traits\UsesCustomId;
use Illuminate\Database\Eloquent\Model;

class WalletTopup extends Model
{
    use UsesCustomId;

    public $idPrefix = 'WTP';
    public $idLength = 20;
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'amount',
        'payment_method',
        'status',
        'idempotency_key',
        'midtrans_transaction_id',
        'proof_image_path',
        'sender_bank',
        'sender_name',
        'sender_account_number',
        'admin_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}