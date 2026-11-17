<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\HasilAssessment;
use App\Models\Karyawan;
use App\Models\Kinerja;
use App\Models\NilaiKpi;
use App\Models\Pelatihan;
use App\Models\ProgresPelatihan;
use App\Models\TargetPelatihan;
use App\Models\Tugas;
use App\Services\PelatihanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pemantauan oleh HR/PSDM: monitoring pelatihan, skill assessment,
 * kinerja, nilai KPI, dan target pelatihan karyawan.
 */
class PemantauanController extends Controller
{
    /** Monitoring pelatihan: status, peserta, dan kehadiran (HR-SRS-04). */
    public function monitoring(): JsonResponse
    {
        $pelatihan = Pelatihan::withCount('peserta')
            ->with(['jadwalPelatihan' => fn ($q) => $q->withCount('presensi')->orderBy('tanggal_pelatihan')])
            ->withCount(['hasilTes as lulus_count' => fn ($q) => $q->where('status_kelulusan', 'lulus')])
            ->orderByDesc('jadwal')
            ->get()
            ->map(function ($item) {
                $kesempatan = $item->peserta_count * $item->jadwalPelatihan->count();

                return [
                    'id' => $item->id,
                    'nama_pelatihan' => $item->nama_pelatihan,
                    'jenis_pelatihan' => $item->jenis_pelatihan,
                    'status_pelatihan' => $item->status_pelatihan,
                    'kuota' => $item->kuota,
                    'jumlah_peserta' => $item->peserta_count,
                    'jumlah_lulus' => $item->lulus_count,
                    'persentase_kehadiran' => $kesempatan > 0
                        ? round($item->jadwalPelatihan->sum('presensi_count') / $kesempatan * 100, 2)
                        : 0,
                    'sesi' => $item->jadwalPelatihan->map(fn ($sesi) => [
                        'id' => $sesi->id,
                        'tanggal_pelatihan' => $sesi->tanggal_pelatihan->toDateString(),
                        'status_jadwal' => $sesi->status_jadwal,
                        'jumlah_hadir' => $sesi->presensi_count,
                    ]),
                ];
            });

        return $this->ok($pelatihan, $pelatihan->isEmpty() ? 'Belum ada data pelatihan' : null);
    }

    // ---- Skill assessment (UC-18) ------------------------------------------

    public function assessment(): JsonResponse
    {
        $hasil = HasilAssessment::with('karyawan:id,nama_karyawan,jabatan,unit_kerja')->latest('id')->get();

        return $this->ok($hasil, $hasil->isEmpty() ? 'Belum ada hasil skill assessment' : null);
    }

    public function detailAssessment(HasilAssessment $hasilAssessment): JsonResponse
    {
        return $this->ok($hasilAssessment->load(['karyawan', 'rincian']));
    }

    /** Menjadwalkan skill assessment berkala sebagai tugas karyawan. */
    public function jadwalkanAssessment(Request $request, PelatihanService $layanan): JsonResponse
    {
        $data = $request->validate([
            'batas_waktu' => ['required', 'date', 'after:now'],
            'karyawan_ids' => ['nullable', 'array'],
            'karyawan_ids.*' => ['integer', 'exists:karyawan,id'],
        ], self::PESAN);

        $ids = Karyawan::where('status_karyawan', 'aktif')
            ->when($data['karyawan_ids'] ?? null, fn ($q, $ids) => $q->whereIn('id', $ids))
            ->pluck('id');

        foreach ($ids as $id) {
            Tugas::updateOrCreate(
                ['karyawan_id' => $id, 'jenis_tugas' => 'skill_assessment', 'status_pengerjaan' => 'belum_dikerjakan'],
                ['nama_tugas' => 'Skill assessment', 'batas_waktu' => $data['batas_waktu']],
            );
        }

        $layanan->kirimNotifikasi($ids, 'Pengingat skill assessment', 'Anda dijadwalkan mengisi skill assessment.');

        return $this->ok(['jumlah_karyawan' => $ids->count()], 'Skill assessment berhasil dijadwalkan', 201);
    }

    // ---- Kinerja (UC-19) ---------------------------------------------------

    public function kinerja(): JsonResponse
    {
        $kinerja = Kinerja::with('karyawan:id,nama_karyawan,jabatan,unit_kerja')->get();

        return $this->ok([
            'ringkasan' => $kinerja->countBy('status_kinerja'),
            'rincian' => $kinerja,
        ], $kinerja->isEmpty() ? 'Data kinerja belum tersedia' : null);
    }

    public function detailKinerja(Karyawan $karyawan): JsonResponse
    {
        $karyawan->load(['kinerja', 'nilaiKpi', 'riwayatPelatihan', 'assessmentTerakhir.rincian']);

        return $this->ok($karyawan, $karyawan->kinerja ? null : 'Data kinerja belum tersedia');
    }

    /** Catatan observasi HR untuk memperbarui status pengembangan karyawan. */
    public function simpanKinerja(Request $request, Karyawan $karyawan): JsonResponse
    {
        $data = $request->validate([
            'status_kinerja' => ['required', 'string', 'max:100'],
            'rincian_kinerja' => ['nullable', 'string'],
        ], self::PESAN);

        return $this->ok(
            Kinerja::updateOrCreate(['karyawan_id' => $karyawan->id], $data),
            'Data kinerja berhasil disimpan',
        );
    }

    // ---- Nilai KPI (UC-20) -------------------------------------------------

    public function kpi(): JsonResponse
    {
        $nilai = NilaiKpi::with('karyawan:id,nama_karyawan,jabatan,unit_kerja,manager_id')->get();

        return $this->ok($nilai, $nilai->isEmpty() ? 'Data penilaian KPI belum tersedia' : null);
    }

    public function detailKpi(Karyawan $karyawan): JsonResponse
    {
        $karyawan->load(['nilaiKpi', 'kpi', 'manager:id,nama_karyawan']);

        return $this->ok($karyawan, $karyawan->nilaiKpi ? null : 'Data penilaian KPI belum tersedia');
    }

    // ---- Target pelatihan --------------------------------------------------

    public function target(): JsonResponse
    {
        return $this->ok(TargetPelatihan::withCount('progres')->get());
    }

    public function simpanTarget(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama_target' => ['required', 'string', 'max:255'],
            'status_target' => ['sometimes', 'in:aktif,nonaktif'],
        ], self::PESAN);

        return $this->ok(TargetPelatihan::create($data)->refresh(), 'Target pelatihan berhasil disimpan', 201);
    }

    public function hapusTarget(TargetPelatihan $targetPelatihan): JsonResponse
    {
        $targetPelatihan->delete();

        return response()->json(['message' => 'Target pelatihan berhasil dihapus']);
    }

    /** Menetapkan target kepada karyawan dan memperbarui progresnya. */
    public function simpanProgres(Request $request, TargetPelatihan $targetPelatihan, Karyawan $karyawan): JsonResponse
    {
        $data = $request->validate([
            'persentase_progres' => ['required', 'numeric', 'min:0', 'max:100'],
        ], self::PESAN);

        $persen = (float) $data['persentase_progres'];

        $progres = ProgresPelatihan::updateOrCreate(
            ['karyawan_id' => $karyawan->id, 'target_pelatihan_id' => $targetPelatihan->id],
            [
                'persentase_progres' => $persen,
                'status_progres' => match (true) {
                    $persen >= 100 => 'tercapai',
                    $persen > 0 => 'berjalan',
                    default => 'belum_dimulai',
                },
            ],
        );

        return $this->ok($progres, 'Progres target pelatihan berhasil disimpan');
    }
}
