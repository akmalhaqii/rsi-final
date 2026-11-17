<?php

namespace App\Http\Controllers;

use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    /** Pesan validasi umum berbahasa Indonesia. */
    protected const PESAN = [
        'required' => ':attribute wajib diisi',
        'unique' => ':attribute sudah digunakan',
        'exists' => ':attribute tidak ditemukan',
        'in' => ':attribute tidak valid',
        'integer' => ':attribute harus berupa bilangan bulat',
        'numeric' => ':attribute harus berupa angka',
        'min' => ':attribute minimal :min',
        'max' => ':attribute maksimal :max',
        'date' => ':attribute harus berupa tanggal yang valid',
        'date_format' => ':attribute harus berformat :format',
        'after' => ':attribute harus setelah :date',
        'array' => ':attribute harus berupa daftar',
    ];

    /** Data karyawan milik akun yang sedang login. */
    protected function karyawan(Request $request): Karyawan
    {
        $karyawan = $request->user()->karyawan;

        abort_if(! $karyawan, 403, 'Akun belum terhubung dengan data karyawan');

        return $karyawan;
    }

    protected function ok(mixed $data, ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json(
            ($message === null ? [] : ['message' => $message]) + ['data' => $data],
            $status,
        );
    }
}
