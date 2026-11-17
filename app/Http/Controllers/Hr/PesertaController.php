<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Models\PesertaPelatihan;
use App\Services\PelatihanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** UC-16 Mengelola Peserta Pelatihan. */
class PesertaController extends Controller
{
    public function index(Pelatihan $pelatihan): JsonResponse
    {
        $peserta = $pelatihan->peserta()->with('karyawan')->get();

        return $this->ok($peserta, $peserta->isEmpty() ? 'Belum ada peserta pada pelatihan ini' : null);
    }

    /** Daftar pengajuan pelatihan karyawan; bawaan hanya yang menunggu persetujuan. */
    public function pengajuan(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'status' => ['nullable', 'in:diajukan,ditolak,terdaftar,selesai,semua'],
        ], self::PESAN);

        $status = $filter['status'] ?? 'diajukan';

        $pengajuan = PesertaPelatihan::where('sumber_pendaftaran', 'mandiri')
            ->when($status !== 'semua', fn ($q) => $q->where('status_peserta', $status))
            ->with(['karyawan:id,nama_karyawan,jabatan,unit_kerja', 'pelatihan:id,nama_pelatihan,jadwal,kuota'])
            ->oldest('updated_at')
            ->get();

        return $this->ok($pengajuan, $pengajuan->isEmpty() ? 'Tidak ada pengajuan pelatihan' : null);
    }

    public function setujui(Request $request, PesertaPelatihan $pengajuan, PelatihanService $layanan): JsonResponse
    {
        $data = $request->validate(['catatan_hr' => ['nullable', 'string', 'max:1000']], self::PESAN);

        return $this->ok(
            $layanan->setujui($pengajuan, $data['catatan_hr'] ?? null),
            'Pengajuan pelatihan disetujui',
        );
    }

    public function tolak(Request $request, PesertaPelatihan $pengajuan, PelatihanService $layanan): JsonResponse
    {
        $data = $request->validate(
            ['catatan_hr' => ['required', 'string', 'max:1000']],
            self::PESAN,
            ['catatan_hr' => 'Alasan penolakan'],
        );

        return $this->ok($layanan->tolak($pengajuan, $data['catatan_hr']), 'Pengajuan pelatihan ditolak');
    }

    /** Assign satu atau beberapa karyawan pada pelatihan. */
    public function store(Request $request, Pelatihan $pelatihan, PelatihanService $layanan): JsonResponse
    {
        $data = $request->validate([
            'karyawan_ids' => ['required', 'array', 'min:1'],
            'karyawan_ids.*' => ['integer', 'distinct', 'exists:karyawan,id'],
        ], self::PESAN);

        $peserta = Karyawan::whereIn('id', $data['karyawan_ids'])
            ->where('status_karyawan', 'aktif')
            ->get()
            ->map(fn ($karyawan) => $layanan->daftarkan($karyawan, $pelatihan, 'hr'));

        return $this->ok($peserta, 'Peserta berhasil ditambahkan', 201);
    }

    /** Un-assign karyawan dari pelatihan. */
    public function destroy(Pelatihan $pelatihan, Karyawan $karyawan, PelatihanService $layanan): JsonResponse
    {
        abort_if(! $karyawan->pesertaDari($pelatihan), 404, 'Karyawan bukan peserta pelatihan ini');

        $layanan->keluarkan($karyawan, $pelatihan);

        return response()->json(['message' => 'Peserta berhasil dikeluarkan dari pelatihan']);
    }

    /** Rekap kehadiran peserta per sesi. */
    public function presensi(Pelatihan $pelatihan): JsonResponse
    {
        $sesi = $pelatihan->jadwalPelatihan()
            ->with('presensi.karyawan:id,nama_karyawan,unit_kerja')
            ->orderBy('tanggal_pelatihan')
            ->get();

        return $this->ok([
            'jumlah_peserta' => $pelatihan->peserta()->count(),
            'sesi' => $sesi,
        ]);
    }
}
