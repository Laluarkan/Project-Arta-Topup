<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Voucher extends Model {
    use UsesCustomId;
    public $idPrefix = 'VCH';
    public $idLength = 10;
    protected $fillable = ['code', 'type', 'value', 'min_transaction', 'max_discount', 'usage_limit', 'used_count', 'expired_at', 'is_active'];
    protected $casts = ['expired_at' => 'datetime', 'is_active' => 'boolean'];
}