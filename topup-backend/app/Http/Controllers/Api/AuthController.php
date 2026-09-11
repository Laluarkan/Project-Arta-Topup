<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'terms_accepted' => 'required|accepted',
            'referral_code' => 'nullable|string|exists:users,referral_code',
        ], [
            'terms_accepted.required' => 'Anda harus menyetujui Syarat & Ketentuan.',
            'terms_accepted.accepted' => 'Anda harus menyetujui Syarat & Ketentuan.',
            'referral_code.exists' => 'Kode referral tidak ditemukan.',
        ]);

        $referrer = $request->referral_code
            ? User::where('referral_code', $request->referral_code)->first()
            : null;

        $user = User::create([
            'id' => Str::uuid(),
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'balance' => 0,
            'is_active' => true,
            'terms_accepted_at' => now(),
            'referral_code' => $this->generateUniqueReferralCode(),
            'referred_by' => $referrer?->id,
        ]);

        $user->assignRole('member');

        // Kirim email verifikasi (dikirim lewat queue, tidak memperlambat response)
        $user->sendEmailVerificationNotification();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Registrasi berhasil. Cek email Anda untuk verifikasi.',
            'data' => [
                'user' => $user,
                'token' => $token
            ]
        ], 201);
    }

    private function generateUniqueReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (User::where('referral_code', $code)->exists());

        return $code;
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email atau password salah.'
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun Anda dinonaktifkan. Hubungi admin.'
            ], 403);
        }

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $user->load('roles');

        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'user' => $user,
                'token' => $token
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Kirim ulang link verifikasi email (wajib login).
     */
    public function resendVerificationEmail(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['status' => 'success', 'message' => 'Email sudah terverifikasi.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['status' => 'success', 'message' => 'Link verifikasi baru sudah dikirim ke email Anda.']);
    }

    /**
     * Endpoint yang diklik dari link di email (signed URL, tanpa perlu login).
     * Setelah verifikasi, redirect ke frontend.
     */
    public function verifyEmail(Request $request, $id, $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect(config('app.frontend_url') . '/auth?verified=0');
        }

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return redirect(config('app.frontend_url') . '/auth?verified=1');
    }

    /**
     * Kirim link reset password ke email.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Selalu balas sukses walau email tidak ditemukan,
        // supaya orang tidak bisa "menebak" email mana saja yang terdaftar (email enumeration).
        if (!$user) {
            return response()->json([
                'status' => 'success',
                'message' => 'Kalau email terdaftar, link reset password sudah dikirim.'
            ]);
        }

        $token = Str::random(64);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $resetUrl = config('app.frontend_url') . '/reset-password?email=' . urlencode($user->email) . '&token=' . $token;

        try {
            \Illuminate\Support\Facades\Mail::send('emails.reset-password', ['url' => $resetUrl, 'name' => $user->name], function ($message) use ($user) {
                $message->to($user->email)->subject('Reset Password - ArTa Zone');
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Gagal kirim email reset password: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Kalau email terdaftar, link reset password sudah dikirim.'
        ]);
    }

    /**
     * Ganti password pakai token dari email.
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['status' => 'error', 'message' => 'Token reset tidak valid.'], 400);
        }

        // Token kedaluwarsa setelah 60 menit
        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['status' => 'error', 'message' => 'Token reset sudah kedaluwarsa. Silakan minta link baru.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'User tidak ditemukan.'], 404);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Hapus semua token API lama supaya sesi lama otomatis logout demi keamanan
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['status' => 'success', 'message' => 'Password berhasil diubah. Silakan login dengan password baru.']);
    }
}