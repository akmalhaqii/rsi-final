<?php

namespace App\Http\Controllers\Karyawan;

use App\Http\Controllers\Controller;
use App\Models\JadwalPelatihan;
use App\Models\Notifikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Informasi aktivitas pengembangan karyawan: notifikasi, target, tugas,
 * jadwal, dan riwayat pelatihan.
 */
class AktivitasController extends Controller
{
    /** UC-03 Menerima Notifikasi Pelatihan. */
    public function notifikasi(Request $request): JsonResponse
    {
        $notifikasi = $this->karyawan($request)->notifikasi()->latest('tanggal_kirim')->latest('id')->get();

        return $this->ok($notifikasi, $notifikasi->isEmpty() ? 'Belum ada notifikasi' : null);
    }

    /** UC-03: notifikasi ditandai sudah dibaca setelah dibuka. */
    public function bacaNotifikasi(Request $request, Notifikasi $notifikasi): JsonResponse
    {
        abort_if($notifikasi->karyawan_id !== $this->karyawan($request)->id, 404);

        $notifikasi->update(['status_baca' => true]);

        return $this->ok($notifikasi);
    }

    /** UC-05 Melihat Target Pelatihan. */
    public function target(Request $request): JsonResponse
    {
        $progres = $this->karyawan($request)->progresPelatihan()->with('target')->get();

        return $this->ok($progres, $progres->isEmpty() ? 'Target pelatihan belum ditetapkan' : null);
    }

    /** UC-06 Melihat Daftar Tugas. */
    public function tugas(Request $request): JsonResponse
    {
        $tugas = $this->karyawan($request)->tugas()
            ->with('pelatihan:id,nama_pelatihan')
            ->orderByRaw("status_pengerjaan = 'selesai'")
            ->orderBy('batas_waktu')
            ->get()
            ->each(function ($item) {
                // Halaman pengerjaan untuk tugas test atau skill assessment.
                $item->setAttribute('tautan_pengerjaan', match ($item->jenis_tugas) {
                    'skill_assessment' => '/api/skill-assessment',
                    default => "/api/pelatihan/{$item->pelatihan_id}/tes/{$item->jenis_tugas}",
                });
            });

        return $this->ok($tugas, $tugas->isEmpty() ? 'Belum ada tugas' : null);
    }

    /** UC-14 Melihat Jadwal Pelatihan. */
    public function jadwal(Request $request): JsonResponse
    {
        $karyawan = $this->karyawan($request);
        $hadir = $karyawan->presensi()->pluck('jadwal_pelatihan_id');

        $jadwal = JadwalPelatihan::whereIn(
            'pelatihan_id',
            $karyawan->pesertaPelatihan()->select('pelatihan_id'),
        )
            ->with('pelatihan:id,nama_pelatihan,jenis_pelatihan')
            ->orderBy('tanggal_pelatihan')
            ->orderBy('waktu_mulai')
            ->get()
            ->each(fn ($sesi) => $sesi->setAttribute('sudah_presensi', $hadir->contains($sesi->id)));

        return $this->ok($jadwal, $jadwal->isEmpty() ? 'Belum ada jadwal pelatihan' : null);
    }

    /** UC-13 Melihat Riwayat Pelatihan, dikelompokkan berdasarkan jenis. */
    public function riwayat(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'q' => ['nullable', 'string'],
            'jenis' => ['nullable', 'in:wajib,mandiri'],
            'status' => ['nullable', 'in:belum_dikerjakan,on_progress,selesai'],
            'kelulusan' => ['nullable', 'in:lulus,tidak_lulus'],
        ], self::PESAN);

        $riwayat = $this->karyawan($request)->riwayatPelatihan()
            ->when($filter['q'] ?? null, fn ($q, $kata) => $q->where('nama_pelatihan', 'like', "%{$kata}%"))
            ->when($filter['jenis'] ?? null, fn ($q, $jenis) => $q->where('jenis_pelatihan', $jenis))
            ->when($filter['status'] ?? null, fn ($q, $status) => $q->where('status_pelatihan', $status))
            ->when($filter['kelulusan'] ?? null, fn ($q, $lulus) => $q->where('status_kelulusan', $lulus))
            ->latest('tanggal_mulai')
            ->get();

        return $this->ok(
            [
                'wajib' => $riwayat->where('jenis_pelatihan', 'wajib')->values(),
                'mandiri' => $riwayat->where('jenis_pelatihan', 'mandiri')->values(),
            ],
            $riwayat->isEmpty() ? 'Riwayat pelatihan tidak ditemukan' : null,
        );
    }
}
