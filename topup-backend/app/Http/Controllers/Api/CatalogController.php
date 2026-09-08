<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Http\Resources\ProductResource;
use Illuminate\Support\Facades\DB;

class CatalogController extends Controller
{
    public function getCategories()
    {
        $categories = Category::where('is_active', true)->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $categories
        ]);
    }

    public function getProductsByCategory($categoryId)
    {
        $products = Product::where('category_id', $categoryId)
            ->where('is_active', true)
            ->where('stock_status', 'available')
            ->orderBy('price_member', 'asc')
            ->get();
            
        return response()->json([
            'status' => 'success',
            'data' => ProductResource::collection($products)
        ]);
    }

    public function getTrendingGames()
    {
        $nonGameKeywords = ['TELKOMSEL', 'INDOSAT', 'XL', 'AXIS', 'SMARTFREN', 'TRI', 'THREE', 'BY.U', 'ISAT', 'PLN', 'PDAM', 'BPJS', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 'LINKAJA', 'E-MONEY', 'GRAB', 'GOJEK', 'MAXIM', 'WIFI', 'VISION', 'MTIX', 'TIX'];

        $trending = Category::where('is_active', true)
            ->where(function($query) use ($nonGameKeywords) {
                foreach ($nonGameKeywords as $keyword) {
                    $query->where('name', 'NOT LIKE', '%' . $keyword . '%');
                }
            })
            ->addSelect(['transactions_count' => DB::table('transactions')
                ->join('products', 'products.id', '=', 'transactions.product_id')
                ->whereColumn('products.category_id', 'categories.id')
                ->selectRaw('count(*)')
            ])
            ->orderByDesc('transactions_count')
            ->take(3)
            ->get();

        $highestCount = $trending->first() ? (int) $trending->first()->transactions_count : 0;

        if ($highestCount === 0 || $trending->count() < 3) {
            $defaultGames = Category::where('is_active', true)
                ->where(function($q) {
                    $q->where('name', 'LIKE', '%MOBILE LEGEND%')
                      ->orWhere('name', 'LIKE', '%FREE FIRE%')
                      ->orWhere('name', 'LIKE', '%PUBG%');
                })
                ->take(3)
                ->get();
            
            if ($defaultGames->isEmpty()) {
                $defaultGames = Category::where('is_active', true)
                    ->where(function($query) use ($nonGameKeywords) {
                        foreach ($nonGameKeywords as $keyword) {
                            $query->where('name', 'NOT LIKE', '%' . $keyword . '%');
                        }
                    })
                    ->inRandomOrder()
                    ->take(3)
                    ->get();
            }
            
            if ($highestCount === 0) {
                $trending = $defaultGames;
            } else {
                $trending = $trending->merge($defaultGames)->unique('id')->take(3);
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $trending->values() 
        ]);
    }
}