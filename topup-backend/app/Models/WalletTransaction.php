<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class WalletTransaction extends Model {
    use UsesCustomId;
    public $idPrefix = 'WLT';
    public $idLength = 15;
    protected $table = 'wallets_transactions';
    protected $fillable = ['user_id', 'type', 'amount', 'balance_before', 'balance_after', 'reference_id'];
    public function user() { return $this->belongsTo(User::class); }
}