<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** UC-17 Mengelola Data Karyawan (data peserta, HR-SRS-01). */
class KaryawanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $karyawan = Karyawan::with('akun')
            ->when($request->query('q'), fn ($q, $kata) => $q->where(
                fn ($q) => $q->where('nama_karyawan', 'like', "%{$kata}%")
                    ->orWhere('jabatan', 'like', "%{$kata}%")
                    ->orWhere('unit_kerja', 'like', "%{$kata}%"),
            ))
            ->when($request->query('unit_kerja'), fn ($q, $unit) => $q->where('unit_kerja', $unit))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status_karyawan', $status))
            ->orderBy('nama_karyawan')
            ->get();

        return $this->ok($karyawan, $karyawan->isEmpty() ? 'Data karyawan tidak ditemukan' : null);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validasi($request);

        $karyawan = DB::transaction(function () use ($data) {
            $akun = Akun::create([
                'username' => $data['username'],
                'password' => $data['password'],
                'hak_akses' => $data['hak_akses'] ?? Akun::HAK_KARYAWAN,
                'status_akun' => 'aktif',
            ]);

            return Karyawan::create([
                'akun_id' => $akun->id,
                'manager_id' => $data['manager_id'] ?? null,
                'nama_karyawan' => $data['nama_karyawan'],
                'jabatan' => $data['jabatan'],
                'unit_kerja' => $data['unit_kerja'],
                'status_karyawan' => 'aktif',
            ]);
        });

        return $this->ok($karyawan->load('akun'), 'Data karyawan berhasil ditambahkan', 201);
    }

    public function show(Karyawan $karyawan): JsonResponse
    {
        return $this->ok($karyawan->load(['akun', 'manager:id,nama_karyawan']));
    }

    public function update(Request $request, Karyawan $karyawan): JsonResponse
    {
        $data = $this->validasi($request, $karyawan);

        DB::transaction(function () use ($data, $karyawan) {
            $karyawan->update(array_intersect_key($data, array_flip([
                'manager_id', 'nama_karyawan', 'jabatan', 'unit_kerja', 'status_karyawan',
            ])));

            $akun = array_intersect_key($data, array_flip(['username', 'password', 'hak_akses']));

            if (isset($data['status_karyawan'])) {
                $akun['status_akun'] = $data['status_karyawan'];
            }

            if ($akun !== [] && $karyawan->akun) {
                $karyawan->akun->update($akun);
            }
        });

        return $this->ok($karyawan->load('akun'), 'Data karyawan berhasil diperbarui');
    }

    /**
     * Menonaktifkan karyawan beserta akunnya. Dengan ?permanen=1 data dihapus.
     */
    public function destroy(Request $request, Karyawan $karyawan): JsonResponse
    {
        abort_if($karyawan->akun_id === $request->user()->id, 422, 'Anda tidak dapat menghapus data Anda sendiri');

        if ($request->boolean('permanen')) {
            DB::transaction(function () use ($karyawan) {
                $akun = $karyawan->akun;
                $karyawan->delete();
                $akun?->tokens()->delete();
                $akun?->delete();
            });

            return response()->json(['message' => 'Data karyawan berhasil dihapus']);
        }

        DB::transaction(function () use ($karyawan) {
            $karyawan->update(['status_karyawan' => 'nonaktif']);
            $karyawan->akun?->update(['status_akun' => 'nonaktif']);
            $karyawan->akun?->tokens()->delete();
        });

        return $this->ok($karyawan, 'Data karyawan berhasil dinonaktifkan');
    }

    private function validasi(Request $request, ?Karyawan $karyawan = null): array
    {
        $wajib = $karyawan ? 'sometimes' : 'required';

        return $request->validate([
            'nama_karyawan' => [$wajib, 'required', 'string', 'max:255'],
            'jabatan' => [$wajib, 'required', 'string', 'max:255'],
            'unit_kerja' => [$wajib, 'required', 'string', 'max:255'],
            'status_karyawan' => ['sometimes', 'in:aktif,nonaktif'],
            'manager_id' => ['nullable', 'integer', Rule::exists('karyawan', 'id')->whereNot('id', $karyawan?->id)],
            'username' => [
                $wajib, 'required', 'string', 'max:50',
                Rule::unique('akun', 'username')->ignore($karyawan?->akun_id),
            ],
            'password' => [$wajib, 'required', Password::min(8)],
            'hak_akses' => ['sometimes', Rule::in(Akun::HAK_AKSES)],
        ], self::PESAN, [
            'nama_karyawan' => 'Nama karyawan',
            'jabatan' => 'Jabatan',
            'unit_kerja' => 'Unit kerja',
            'username' => 'Username',
            'password' => 'Password',
        ]);
    }
}
