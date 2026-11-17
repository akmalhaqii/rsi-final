<?php

namespace App\Http\Controllers\Hr;

use App\Http\Controllers\Controller;
use App\Models\JadwalPelatihan;
use App\Models\Karyawan;
use App\Models\MateriPelatihan;
use App\Models\Pelatihan;
use App\Models\SoalTes;
use App\Services\PelatihanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * UC-15 Mengelola Pelatihan dan UC-21 Mengelola Rencana Pelatihan,
 * termasuk sesi (jadwal), materi, dan soal tes sebuah pelatihan.
 */
class PelatihanController extends Controller
{
    private const PESAN_RENCANA = ['required' => 'Data tidak lengkap, mohon isi seluruh kolom'];

    public function __construct(private PelatihanService $layanan) {}

    public function index(Request $request): JsonResponse
    {
        $pelatihan = Pelatihan::query()
            ->when($request->query('q'), fn ($q, $kata) => $q->where('nama_pelatihan', 'like', "%{$kata}%"))
            ->when($request->query('status'), fn ($q, $status) => $q->where('status_pelatihan', $status))
            ->withCount('peserta')
            ->with(['jadwalPelatihan' => fn ($q) => $q->orderBy('tanggal_pelatihan')])
            ->orderByDesc('jadwal')
            ->get();

        return $this->ok($pelatihan, $pelatihan->isEmpty() ? 'Data pelatihan tidak ditemukan' : null);
    }

    public function store(Request $request): JsonResponse
    {
        $pelatihan = Pelatihan::create($this->validasi($request));

        if ($pelatihan->status_pelatihan === 'aktif') {
            $this->layanan->kirimNotifikasi(
                Karyawan::where('status_karyawan', 'aktif')->pluck('id'),
                'Pelatihan baru',
                "Pelatihan {$pelatihan->nama_pelatihan} tersedia mulai {$pelatihan->jadwal->toDateString()}.",
            );
        }

        return $this->ok($pelatihan->refresh(), 'Rencana pelatihan berhasil disimpan', 201);
    }

    public function show(Pelatihan $pelatihan): JsonResponse
    {
        return $this->ok(
            $pelatihan->load(['jadwalPelatihan', 'materi'])->loadCount(['peserta', 'soal']),
        );
    }

    public function update(Request $request, Pelatihan $pelatihan): JsonResponse
    {
        $pelatihan->update($this->validasi($request, sebagian: true));

        return $this->ok($pelatihan, 'Pelatihan berhasil diperbarui');
    }

    public function destroy(Pelatihan $pelatihan): JsonResponse
    {
        $pelatihan->delete();

        return response()->json(['message' => 'Pelatihan berhasil dihapus']);
    }

    // ---- Sesi / jadwal -----------------------------------------------------

    public function simpanJadwal(Request $request, Pelatihan $pelatihan): JsonResponse
    {
        $jadwal = $pelatihan->jadwalPelatihan()->create($this->validasiJadwal($request));

        $this->beriTahuPeserta($pelatihan, 'Jadwal pelatihan baru', $jadwal);

        return $this->ok($jadwal->refresh(), 'Sesi pelatihan berhasil dibuat', 201);
    }

    public function ubahJadwal(Request $request, JadwalPelatihan $jadwal): JsonResponse
    {
        $jadwal->fill($this->validasiJadwal($request, sebagian: true));

        $berubah = $jadwal->isDirty(['tanggal_pelatihan', 'waktu_mulai', 'waktu_selesai', 'lokasi']);
        $jadwal->save();

        if ($berubah) {
            $this->beriTahuPeserta($jadwal->pelatihan, 'Perubahan jadwal pelatihan', $jadwal);
        }

        return $this->ok($jadwal, 'Sesi pelatihan berhasil diperbarui');
    }

    public function hapusJadwal(JadwalPelatihan $jadwal): JsonResponse
    {
        $jadwal->delete();

        return response()->json(['message' => 'Sesi pelatihan berhasil dihapus']);
    }

    // ---- Materi ------------------------------------------------------------

    public function simpanMateri(Request $request, Pelatihan $pelatihan): JsonResponse
    {
        $materi = $pelatihan->materi()->create($this->validasiMateri($request));

        return $this->ok($materi->refresh(), 'Materi berhasil ditambahkan', 201);
    }

    public function ubahMateri(Request $request, MateriPelatihan $materi): JsonResponse
    {
        $materi->update($this->validasiMateri($request, sebagian: true));

        return $this->ok($materi, 'Materi berhasil diperbarui');
    }

    public function hapusMateri(MateriPelatihan $materi): JsonResponse
    {
        $materi->delete();

        return response()->json(['message' => 'Materi berhasil dihapus']);
    }

    // ---- Soal tes ----------------------------------------------------------

    public function soal(Pelatihan $pelatihan): JsonResponse
    {
        return $this->ok($pelatihan->soal()->get()->makeVisible('jawaban_benar'));
    }

    public function simpanSoal(Request $request, Pelatihan $pelatihan): JsonResponse
    {
        $data = $request->validate([
            'jenis_tes' => ['required', 'in:pre_test,post_test'],
            'pertanyaan' => ['required', 'string'],
            'pilihan' => ['required', 'array', 'min:2'],
            'pilihan.*' => ['required', 'string'],
            'jawaban_benar' => ['required', 'string'],
        ], self::PESAN);

        abort_if(
            ! array_key_exists($data['jawaban_benar'], $data['pilihan']),
            422,
            'Jawaban benar harus salah satu kunci pilihan',
        );

        $soal = $pelatihan->soal()->create($data);

        return $this->ok($soal->makeVisible('jawaban_benar'), 'Soal berhasil ditambahkan', 201);
    }

    public function hapusSoal(SoalTes $soal): JsonResponse
    {
        $soal->delete();

        return response()->json(['message' => 'Soal berhasil dihapus']);
    }

    // ---- Validasi ----------------------------------------------------------

    private function validasi(Request $request, bool $sebagian = false): array
    {
        $wajib = $sebagian ? 'sometimes' : 'required';

        return $request->validate([
            'nama_pelatihan' => [$wajib, 'required', 'string', 'max:255'],
            'jadwal' => [$wajib, 'required', 'date'],
            'kuota' => [$wajib, 'required', 'integer', 'min:1'],
            'deskripsi' => ['nullable', 'string'],
            'jenis_pelatihan' => ['sometimes', 'in:wajib,umum'],
            'kompetensi' => ['nullable', Rule::in(config('skillgrow.kompetensi'))],
            'passing_grade' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'passing_grade_divisi' => ['nullable', 'array'],
            'passing_grade_divisi.*' => ['numeric', 'min:0', 'max:100'],
            'status_pelatihan' => ['sometimes', 'in:rencana,aktif,selesai'],
        ], self::PESAN_RENCANA + self::PESAN);
    }

    private function validasiJadwal(Request $request, bool $sebagian = false): array
    {
        $wajib = $sebagian ? 'sometimes' : 'required';

        return $request->validate([
            'tanggal_pelatihan' => [$wajib, 'required', 'date'],
            'waktu_mulai' => [$wajib, 'required', 'date_format:H:i'],
            'waktu_selesai' => [$wajib, 'required', 'date_format:H:i', 'after:waktu_mulai'],
            'lokasi' => [$wajib, 'required', 'string', 'max:255'],
            'status_jadwal' => ['sometimes', 'in:terjadwal,dibuka,ditutup,selesai'],
        ], self::PESAN);
    }

    private function validasiMateri(Request $request, bool $sebagian = false): array
    {
        $wajib = $sebagian ? 'sometimes' : 'required';

        return $request->validate([
            'judul_materi' => [$wajib, 'required', 'string', 'max:255'],
            'jenis_materi' => [$wajib, 'required', 'in:dokumen,video,tautan,latihan_soal,zoom'],
            'lokasi_materi' => [$wajib, 'required', 'string', 'max:2048'],
            'urutan' => ['sometimes', 'integer', 'min:1'],
            'status_publikasi' => ['sometimes', 'in:draft,terbit'],
        ], self::PESAN);
    }

    private function beriTahuPeserta(Pelatihan $pelatihan, string $judul, JadwalPelatihan $jadwal): void
    {
        $this->layanan->kirimNotifikasi(
            $pelatihan->peserta()->pluck('karyawan_id'),
            $judul,
            "{$pelatihan->nama_pelatihan}: {$jadwal->tanggal_pelatihan->toDateString()} "
                ."pukul {$jadwal->waktu_mulai}-{$jadwal->waktu_selesai} di {$jadwal->lokasi}.",
        );
    }
}
