<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Product extends Model {
    use UsesCustomId;
    public $idPrefix = 'PROD';
    public $idLength = 12;
    protected $fillable = ['category_id', 'provider_id', 'buyer_sku_code', 'product_name', 'price_member', 'price_reseller', 'provider_price', 'stock_status', 'is_active'];
    public function category() { return $this->belongsTo(Category::class); }
    public function provider() { return $this->belongsTo(Provider::class); }
}