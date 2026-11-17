<?php

namespace App\Services;

use App\Models\HasilAssessment;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Models\Tugas;
use Illuminate\Support\Facades\DB;

class SkillAssessmentService
{
    /** Standar skor sebuah kompetensi bagi jabatan karyawan. */
    public function standar(Karyawan $karyawan, string $kompetensi): float
    {
        return (float) (config("skillgrow.standar_jabatan.{$karyawan->jabatan}.{$kompetensi}")
            ?? config('skillgrow.standar_kompetensi'));
    }

    public function level(float $skor): string
    {
        foreach (config('skillgrow.level') as $level) {
            if ($skor >= $level['min']) {
                return $level['nama'];
            }
        }

        return 'Pemula';
    }

    /**
     * Memproses dan menyimpan hasil pengisian skill assessment (UC-07).
     *
     * @param  array<int, array{kompetensi: string, skor: int|float}>  $jawaban
     */
    public function simpan(Karyawan $karyawan, array $jawaban): HasilAssessment
    {
        return DB::transaction(function () use ($karyawan, $jawaban) {
            $hasil = HasilAssessment::create([
                'karyawan_id' => $karyawan->id,
                'hasil_assessment' => round(collect($jawaban)->avg('skor'), 2),
                'data_assessment' => $jawaban,
            ]);

            foreach ($jawaban as $item) {
                $skor = (float) $item['skor'];

                $hasil->rincian()->create([
                    'kompetensi' => $item['kompetensi'],
                    'skor' => $skor,
                    'pencapaian' => $skor >= $this->standar($karyawan, $item['kompetensi'])
                        ? 'Tercapai'
                        : 'Belum tercapai',
                    'level_kompetensi' => $this->level($skor),
                ]);
            }

            Tugas::where('karyawan_id', $karyawan->id)
                ->where('jenis_tugas', 'skill_assessment')
                ->update(['status_pengerjaan' => 'selesai']);

            return $hasil->load('rincian');
        });
    }

    /**
     * Rekomendasi pelatihan berdasarkan hasil assessment terakhir (PGN-SRS-08).
     *
     * @return array{rekomendasi: mixed, kompetensi_tercover: mixed, kebutuhan_belum_tersedia: mixed}|null
     */
    public function rekomendasi(Karyawan $karyawan): ?array
    {
        $hasil = $karyawan->assessmentTerakhir()->with('rincian')->first();

        if (! $hasil) {
            return null;
        }

        $kurang = $hasil->rincian->where('pencapaian', 'Belum tercapai')->pluck('kompetensi');

        $sudahLulus = $karyawan->riwayatPelatihan()
            ->where('status_kelulusan', 'lulus')
            ->pluck('pelatihan_id');

        $pelatihan = Pelatihan::where('status_pelatihan', 'aktif')
            ->whereIn('kompetensi', $kurang)
            ->whereNotIn('id', $sudahLulus)
            ->withCount('peserta')
            ->with('jadwalPelatihan')
            ->orderBy('jadwal')
            ->get();

        return [
            'rekomendasi' => $pelatihan,
            'kompetensi_tercover' => $hasil->rincian->where('pencapaian', 'Tercapai')->pluck('kompetensi')->values(),
            'kebutuhan_belum_tersedia' => $kurang->diff($pelatihan->pluck('kompetensi'))->values(),
        ];
    }
}
