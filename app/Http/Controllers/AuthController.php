<?php

namespace App\Http\Controllers;

use App\Models\Akun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /** UC-04 Melakukan Login. */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ], self::PESAN);

        $akun = Akun::where('username', $data['username'])->first();

        if (! $akun || ! Hash::check($data['password'], $akun->password)) {
            return response()->json(['message' => 'Username atau password salah'], 401);
        }

        if (! $akun->aktif()) {
            return response()->json(['message' => 'Akses ditolak: akun tidak aktif'], 403);
        }

        return $this->ok([
            'token' => $akun->createToken('api')->plainTextToken,
            'tipe_token' => 'Bearer',
            'akun' => $akun->load('karyawan'),
        ], 'Login berhasil');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout berhasil']);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok($request->user()->load('karyawan'));
    }
}
