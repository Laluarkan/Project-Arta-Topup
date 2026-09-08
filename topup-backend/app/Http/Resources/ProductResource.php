<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'product_name' => $this->product_name,
            'price_member' => $this->price_member,
            'stock_status' => $this->stock_status,
            'is_active' => $this->is_active,
            // provider_id, provider_price, buyer_sku_code, price_reseller
            // SENGAJA TIDAK di-expose ke publik.
        ];
    }
}