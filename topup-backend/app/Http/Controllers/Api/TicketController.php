<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Ticket;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $tickets = Ticket::where('user_id', $request->user()->id)
                        ->orderBy('created_at', 'desc')
                        ->get();
                        
        return response()->json(['status' => 'success', 'data' => $tickets]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string'
        ]);

        $ticket = Ticket::create([
            'user_id' => $request->user()->id,
            'subject' => $request->subject,
            'message' => $request->message,
            'status' => 'OPEN'
        ]);

        return response()->json(['status' => 'success', 'data' => $ticket]);
    }
}