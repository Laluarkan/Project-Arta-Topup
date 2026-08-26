<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('roles')->orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $users
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|string|exists:roles,name',
            'balance' => 'required|numeric|min:0'
        ]);

        $user = User::findOrFail($id);
        
        $user->balance = $request->balance;
        $user->save();

        $user->syncRoles([$request->role]);

        return response()->json([
            'status' => 'success',
            'message' => 'Data user berhasil diperbarui',
            'data' => $user->load('roles')
        ]);
    }
}