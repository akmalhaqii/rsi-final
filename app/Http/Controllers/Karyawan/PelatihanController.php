<?php

namespace App\Http\Controllers\Karyawan;

use App\Http\Controllers\Controller;
use App\Models\JadwalPelatihan;
use App\Models\Pelatihan;
use App\Models\Presensi;
use App\Models\RiwayatPelatihan;
use App\Services\PelatihanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PelatihanController extends Controller
{
    /** Daftar pelatihan yang tersedia (PGN-SRS-03). */
    public function index(Request $request): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        $filter = $request->validate([
            'q' => ['nullable', 'string'],
            'jenis' => ['nullable', 'in:wajib,umum'],
        ], self::PESAN);

        $status = $karyawan->pengajuanPelatihan()->pluck('status_peserta', 'pelatihan_id');

        $pelatihan = Pelatihan::where('status_pelatihan', 'aktif')
            ->when($filter['q'] ?? null, fn ($q, $kata) => $q->where('nama_pelatihan', 'like', "%{$kata}%"))
            ->when($filter['jenis'] ?? null, fn ($q, $jenis) => $q->where('jenis_pelatihan', $jenis))
            ->withCount('peserta')
            ->with(['jadwalPelatihan' => fn ($q) => $q->orderBy('tanggal_pelatihan')])
            ->orderBy('jadwal')
            ->get()
            ->each(fn ($item) => $item->setAttribute('status_pendaftaran', $status->get($item->id)));

        return $this->ok($pelatihan, $pelatihan->isEmpty() ? 'Pelatihan tidak ditemukan' : null);
    }

    /** UC-09 Melihat Daftar Pelatihan Aktif yang sedang diikuti. */
    public function aktif(Request $request): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        $pelatihan = Pelatihan::whereIn(
            'id',
            $karyawan->pesertaPelatihan()->where('status_peserta', 'terdaftar')->select('pelatihan_id'),
        )
            ->withCount('peserta')
            ->with(['jadwalPelatihan' => fn ($q) => $q->orderBy('tanggal_pelatihan')])
            ->orderBy('jadwal')
            ->get();

        $pesan = match (true) {
            $pelatihan->isNotEmpty() => null,
            $karyawan->pesertaPelatihan()->exists() => 'Seluruh pelatihan telah diselesaikan, lihat riwayat Anda',
            default => 'Sesi pelatihan belum tersedia',
        };

        return $this->ok($pelatihan, $pesan);
    }

    /** UC-12 Melihat Materi Pelatihan: detail pelatihan beserta materinya. */
    public function show(Request $request, Pelatihan $pelatihan): JsonResponse
    {
        $karyawan = $this->karyawan($request);
        $terdaftar = $karyawan->pesertaDari($pelatihan);

        abort_if($pelatihan->status_pelatihan !== 'aktif' && ! $terdaftar, 404);

        $pelatihan->load([
            'jadwalPelatihan' => fn ($q) => $q->orderBy('tanggal_pelatihan'),
            'materi' => fn ($q) => $q->where('status_publikasi', 'terbit'),
        ])->loadCount('peserta')->setAttribute('sudah_terdaftar', $terdaftar);

        $hadir = $karyawan->presensi()->pluck('jadwal_pelatihan_id');
        $pelatihan->jadwalPelatihan->each(
            fn ($sesi) => $sesi->setAttribute('sudah_presensi', $hadir->contains($sesi->id)),
        );

        return $this->ok($pelatihan);
    }

    /** Status pengajuan pelatihan milik karyawan (disetujui, ditolak, atau menunggu). */
    public function pengajuan(Request $request): JsonResponse
    {
        $pengajuan = $this->karyawan($request)->pengajuanPelatihan()
            ->where('sumber_pendaftaran', 'mandiri')
            ->with('pelatihan:id,nama_pelatihan,jadwal')
            ->latest('updated_at')
            ->get();

        return $this->ok($pengajuan, $pengajuan->isEmpty() ? 'Belum ada pengajuan pelatihan' : null);
    }

    /**
     * UC-10 Mengikuti Pelatihan: pengajuan pendaftaran pelatihan umum,
     * yang menunggu persetujuan HR/PSDM.
     */
    public function daftar(Request $request, Pelatihan $pelatihan, PelatihanService $layanan): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        abort_if($pelatihan->status_pelatihan !== 'aktif', 422, 'Pelatihan tidak tersedia untuk pendaftaran');

        if ($pelatihan->jenis_pelatihan === 'wajib') {
            return $karyawan->pesertaDari($pelatihan)
                ? $this->ok(null, 'Pelatihan wajib: Anda sudah didaftarkan oleh HR/PSDM')
                : response()->json(['message' => 'Pelatihan wajib: peserta ditetapkan oleh HR/PSDM'], 422);
        }

        $data = $request->validate([
            'alasan_pengajuan' => ['required', 'string', 'max:1000'],
        ], self::PESAN, ['alasan_pengajuan' => 'Alasan pengajuan']);

        return $this->ok(
            $layanan->ajukan($karyawan, $pelatihan, $data['alasan_pengajuan']),
            'Pengajuan pelatihan terkirim dan menunggu persetujuan HR/PSDM',
            201,
        );
    }

    /** UC-11 Mengisi Presensi. */
    public function presensi(Request $request, JadwalPelatihan $jadwal): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        abort_if(! $karyawan->pesertaDari($jadwal->pelatihan), 403, 'Anda bukan peserta pelatihan ini');

        if ($jadwal->status_jadwal !== 'dibuka') {
            return response()->json([
                'message' => 'Presensi tidak tersedia: sesi belum dibuka atau sudah ditutup',
            ], 422);
        }

        $kunci = ['karyawan_id' => $karyawan->id, 'jadwal_pelatihan_id' => $jadwal->id];

        if ($presensi = Presensi::where($kunci)->first()) {
            return $this->ok($presensi, 'Presensi sudah tercatat sebelumnya');
        }

        $presensi = Presensi::create($kunci + ['status_presensi' => 'hadir', 'waktu_presensi' => now()]);

        RiwayatPelatihan::where('karyawan_id', $karyawan->id)
            ->where('pelatihan_id', $jadwal->pelatihan_id)
            ->where('status_pelatihan', 'belum_dikerjakan')
            ->update(['status_pelatihan' => 'on_progress']);

        return $this->ok($presensi, 'Presensi berhasil disimpan', 201);
    }
}
