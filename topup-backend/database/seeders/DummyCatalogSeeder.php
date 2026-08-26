<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Provider;
use App\Models\Product;

class DummyCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $provider = Provider::create([
            'name' => 'Digiflazz (Mock)',
            'is_active' => true,
            'api_config' => []
        ]);

        $catML = Category::create(['name' => 'Mobile Legends', 'is_active' => true]);
        $catFF = Category::create(['name' => 'Free Fire', 'is_active' => true]);
        $catPUBG = Category::create(['name' => 'PUBG Mobile', 'is_active' => true]);
        $catGenshin = Category::create(['name' => 'Genshin Impact', 'is_active' => true]);
        $catValo = Category::create(['name' => 'Valorant', 'is_active' => true]);
        $catSteam = Category::create(['name' => 'Steam Wallet', 'is_active' => true]);

        $products = [
            ['category_id' => $catML->id, 'buyer_sku_code' => 'ML86', 'product_name' => '86 Diamonds', 'price' => 20000],
            ['category_id' => $catML->id, 'buyer_sku_code' => 'ML172', 'product_name' => '172 Diamonds', 'price' => 39000],
            ['category_id' => $catML->id, 'buyer_sku_code' => 'ML344', 'product_name' => '344 Diamonds', 'price' => 75000],
            ['category_id' => $catML->id, 'buyer_sku_code' => 'MLW', 'product_name' => 'Weekly Pass', 'price' => 29000],
            ['category_id' => $catFF->id, 'buyer_sku_code' => 'FF70', 'product_name' => '70 Diamonds', 'price' => 10000],
            ['category_id' => $catFF->id, 'buyer_sku_code' => 'FF140', 'product_name' => '140 Diamonds', 'price' => 19000],
            ['category_id' => $catPUBG->id, 'buyer_sku_code' => 'PUBG60', 'product_name' => '60 UC', 'price' => 15000],
            ['category_id' => $catGenshin->id, 'buyer_sku_code' => 'GI60', 'product_name' => '60 Genesis Crystals', 'price' => 16000],
            ['category_id' => $catValo->id, 'buyer_sku_code' => 'VALO125', 'product_name' => '125 Points', 'price' => 15000],
        ];

        foreach ($products as $p) {
            Product::create([
                'category_id' => $p['category_id'],
                'provider_id' => $provider->id,
                'buyer_sku_code' => $p['buyer_sku_code'],
                'product_name' => $p['product_name'],
                'provider_price' => $p['price'] - 2000,
                'price_member' => $p['price'],
                'price_reseller' => $p['price'] - 1000,
                'stock_status' => 'available',
                'is_active' => true,
            ]);
        }
    }
}