<?php

namespace App\Http\Controllers\Karyawan;

use App\Http\Controllers\Controller;
use App\Services\SkillAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SkillAssessmentController extends Controller
{
    public function __construct(private SkillAssessmentService $layanan) {}

    /** Formulir skill assessment: kompetensi yang dinilai beserta standarnya. */
    public function form(Request $request): JsonResponse
    {
        $karyawan = $this->karyawan($request);

        return $this->ok([
            'skala' => ['min' => 0, 'max' => 100],
            'kompetensi' => collect(config('skillgrow.kompetensi'))->map(fn ($nama) => [
                'kompetensi' => $nama,
                'standar' => $this->layanan->standar($karyawan, $nama),
            ]),
        ]);
    }

    /** UC-07 Skill Assessment. */
    public function store(Request $request): JsonResponse
    {
        $kompetensi = config('skillgrow.kompetensi');

        $jawaban = $request->validate([
            'jawaban' => ['required', 'array', 'size:'.count($kompetensi)],
            'jawaban.*.kompetensi' => ['required', 'distinct', Rule::in($kompetensi)],
            'jawaban.*.skor' => ['required', 'numeric', 'min:0', 'max:100'],
        ], ['jawaban.size' => 'Seluruh kompetensi wajib dinilai'] + self::PESAN)['jawaban'];

        $karyawan = $this->karyawan($request);
        $hasil = $this->layanan->simpan($karyawan, $jawaban);

        return $this->ok(
            ['hasil' => $hasil] + $this->layanan->rekomendasi($karyawan),
            'Hasil skill assessment berhasil disimpan',
            201,
        );
    }

    /** Hasil skill assessment terakhir beserta riwayatnya. */
    public function hasil(Request $request): JsonResponse
    {
        $hasil = $this->karyawan($request)->hasilAssessment()->with('rincian')->latest('id')->get();

        return $this->ok($hasil, $hasil->isEmpty() ? 'Belum ada hasil skill assessment' : null);
    }

    /** Rekomendasi pelatihan berdasarkan hasil skill assessment (PGN-SRS-08). */
    public function rekomendasi(Request $request): JsonResponse
    {
        $rekomendasi = $this->layanan->rekomendasi($this->karyawan($request));

        if ($rekomendasi === null) {
            return $this->ok(null, 'Isi skill assessment terlebih dahulu untuk memperoleh rekomendasi pelatihan');
        }

        return $this->ok($rekomendasi);
    }
}
