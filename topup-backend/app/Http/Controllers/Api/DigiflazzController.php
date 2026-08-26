<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DigiflazzService;
use Illuminate\Http\Request;

class DigiflazzController extends Controller
{
    public function sync(DigiflazzService $service)
    {
        $result = $service->syncProducts();
        
        if ($result['status']) {
            return response()->json([
                'success' => true, 
                'message' => $result['message']
            ], 200);
        }
        
        return response()->json([
            'success' => false, 
            'message' => $result['message']
        ], 500);
    }
}