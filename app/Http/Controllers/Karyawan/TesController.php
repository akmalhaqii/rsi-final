<?php

namespace App\Http\Controllers\Karyawan;

use App\Http\Controllers\Controller;
use App\Models\HasilTes;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Models\PesertaPelatihan;
use App\Models\Presensi;
use App\Models\RiwayatPelatihan;
use App\Models\Tugas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** UC-08 Mengerjakan Test (pre-test dan post-test/evaluasi pelatihan). */
class TesController extends Controller
{
    public function show(Request $request, Pelatihan $pelatihan, string $jenis): JsonResponse
    {
        $this->pastikanBolehMengerjakan($this->karyawan($request), $pelatihan, $jenis);

        $soal = $pelatihan->soal()->where('jenis_tes', $jenis)->get(['id', 'pertanyaan', 'pilihan']);

        return $this->ok($soal, $soal->isEmpty() ? 'Soal tes belum tersedia' : null);
    }

    public function store(Request $request, Pelatihan $pelatihan, string $jenis): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        $this->pastikanBolehMengerjakan($karyawan, $pelatihan, $jenis);

        $soal = $pelatihan->soal()->where('jenis_tes', $jenis)->get();

        abort_if($soal->isEmpty(), 422, 'Soal tes belum tersedia');

        $jawaban = $request->validate([
            'jawaban' => ['required', 'array'],
            'jawaban.*' => ['nullable', 'string'],
        ], self::PESAN)['jawaban'];

        $benar = $soal->filter(
            fn ($item) => (string) ($jawaban[$item->id] ?? '') === $item->jawaban_benar,
        )->count();

        $skor = round($benar / $soal->count() * 100, 2);

        $hasil = DB::transaction(
            fn () => $this->simpanHasil($karyawan, $pelatihan, $jenis, $skor, $jawaban),
        );

        $data = ['hasil' => $hasil, 'jumlah_benar' => $benar, 'jumlah_soal' => $soal->count()];

        if ($jenis === 'pre_test') {
            return $this->ok($data, 'Pre-test berhasil dikirim', 201);
        }

        $data['passing_grade'] = $pelatihan->passingGradeUntuk($karyawan);

        if ($hasil->status_kelulusan === 'lulus') {
            $data['sertifikat'] = [
                'nomor' => $hasil->nomor_sertifikat,
                'nama_karyawan' => $karyawan->nama_karyawan,
                'nama_pelatihan' => $pelatihan->nama_pelatihan,
                'tanggal_terbit' => $hasil->created_at->toDateString(),
            ];

            return $this->ok($data, 'Selamat, Anda lulus post-test', 201);
        }

        // Tindak lanjut bagi peserta yang belum memenuhi standar.
        $data['materi_perbaikan'] = $pelatihan->materi()
            ->where('status_publikasi', 'terbit')
            ->whereIn('jenis_materi', ['latihan_soal', 'zoom'])
            ->get();

        return $this->ok($data, 'Nilai post-test belum memenuhi passing grade, silakan ikuti materi perbaikan', 201);
    }

    private function pastikanBolehMengerjakan(Karyawan $karyawan, Pelatihan $pelatihan, string $jenis): void
    {
        abort_if(! $karyawan->pesertaDari($pelatihan), 403, 'Anda bukan peserta pelatihan ini');

        $sudah = HasilTes::where('karyawan_id', $karyawan->id)
            ->where('pelatihan_id', $pelatihan->id)
            ->where('jenis_tes', $jenis);

        if ($jenis === 'pre_test') {
            abort_if($sudah->exists(), 409, 'Pre-test sudah dikerjakan');

            return;
        }

        abort_if($sudah->where('status_kelulusan', 'lulus')->exists(), 409, 'Anda sudah lulus post-test pelatihan ini');

        $hadir = Presensi::where('karyawan_id', $karyawan->id)
            ->whereIn('jadwal_pelatihan_id', $pelatihan->jadwalPelatihan()->select('id'))
            ->exists();

        abort_if(! $hadir, 422, 'Post-test belum memenuhi persyaratan: Anda belum mengisi presensi pelatihan');
    }

    private function simpanHasil(Karyawan $karyawan, Pelatihan $pelatihan, string $jenis, float $skor, array $jawaban): HasilTes
    {
        $kunci = ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id];
        $lulus = $skor >= $pelatihan->passingGradeUntuk($karyawan);

        $hasil = HasilTes::create($kunci + [
            'jenis_tes' => $jenis,
            'hasil_tes' => $skor,
            'jawaban_tes' => $jawaban,
            'status_kelulusan' => $jenis === 'post_test' ? ($lulus ? 'lulus' : 'tidak_lulus') : null,
            'nomor_sertifikat' => $jenis === 'post_test' && $lulus
                ? 'SG-'.now()->format('Ymd').'-'.Str::upper(Str::random(8))
                : null,
        ]);

        if ($jenis === 'pre_test' || $lulus) {
            Tugas::where($kunci)->where('jenis_tugas', $jenis)->update(['status_pengerjaan' => 'selesai']);
        }

        if ($jenis === 'post_test') {
            RiwayatPelatihan::where($kunci)->update([
                'status_pelatihan' => $lulus ? 'selesai' : 'on_progress',
                'status_kelulusan' => $hasil->status_kelulusan,
                'tanggal_selesai' => $lulus ? today() : null,
            ]);

            if ($lulus) {
                PesertaPelatihan::where($kunci)->update(['status_peserta' => 'selesai']);
            }
        }

        return $hasil;
    }
}
