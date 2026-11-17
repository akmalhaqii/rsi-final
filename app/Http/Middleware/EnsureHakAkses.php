<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Membatasi akses berdasarkan hak akses akun (NFR-SRS-03, UC-04).
 * Tanpa parameter, middleware hanya memastikan akun masih aktif.
 */
class EnsureHakAkses
{
    public function handle(Request $request, Closure $next, string ...$hakAkses): Response
    {
        $akun = $request->user();

        if (! $akun || ! $akun->aktif()) {
            return response()->json(['message' => 'Akses ditolak: akun tidak aktif'], 403);
        }

        if ($hakAkses !== [] && ! in_array($akun->hak_akses, $hakAkses, true)) {
            return response()->json(['message' => 'Akses ditolak: Anda tidak memiliki izin untuk fitur ini'], 403);
        }

        return $next($request);
    }
}
