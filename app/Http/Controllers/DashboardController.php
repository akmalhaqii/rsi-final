<?php

namespace App\Http\Controllers;

use App\Models\Akun;
use App\Models\JadwalPelatihan;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Models\PesertaPelatihan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Dashboard sesuai hak akses pengguna (PGN-SRS-02, SYS-SR-02). */
    public function __invoke(Request $request): JsonResponse
    {
        $akun = $request->user();
        $karyawan = $akun->karyawan;

        $data = ['hak_akses' => $akun->hak_akses, 'karyawan' => $karyawan];

        if ($karyawan && $akun->hak_akses !== Akun::HAK_MANAGER) {
            $data['pengembangan'] = $this->ringkasanKaryawan($karyawan);
        }

        if ($akun->hak_akses === Akun::HAK_HR) {
            $data['pengelolaan'] = [
                'karyawan_aktif' => Karyawan::where('status_karyawan', 'aktif')->count(),
                'pelatihan_aktif' => Pelatihan::where('status_pelatihan', 'aktif')->count(),
                'peserta_terdaftar' => PesertaPelatihan::whereIn('status_peserta', PesertaPelatihan::STATUS_PESERTA)->count(),
                'pengajuan_menunggu' => PesertaPelatihan::where('status_peserta', 'diajukan')->count(),
                'sesi_mendatang' => JadwalPelatihan::whereDate('tanggal_pelatihan', '>=', today())
                    ->with('pelatihan:id,nama_pelatihan')
                    ->orderBy('tanggal_pelatihan')
                    ->limit(5)
                    ->get(),
            ];
        }

        if ($karyawan && $akun->hak_akses === Akun::HAK_MANAGER) {
            $staf = $karyawan->staf()->with('nilaiKpi')->get();

            $data['tim'] = [
                'jumlah_staf' => $staf->count(),
                'sudah_dinilai_kpi' => $staf->whereNotNull('nilaiKpi')->count(),
                'rata_rata_capaian_target' => round((float) $karyawan->staf()
                    ->join('target_capaian', 'target_capaian.karyawan_id', '=', 'karyawan.id')
                    ->avg('target_capaian.persentase_capaian'), 2),
            ];
        }

        return $this->ok($data);
    }

    private function ringkasanKaryawan(Karyawan $karyawan): array
    {
        return [
            'target_pelatihan' => $karyawan->progresPelatihan()->with('target')->get(),
            'jadwal_terdekat' => JadwalPelatihan::whereDate('tanggal_pelatihan', '>=', today())
                ->whereIn('pelatihan_id', $karyawan->pesertaPelatihan()->select('pelatihan_id'))
                ->with('pelatihan:id,nama_pelatihan')
                ->orderBy('tanggal_pelatihan')
                ->orderBy('waktu_mulai')
                ->limit(3)
                ->get(),
            'pelatihan_diikuti' => $karyawan->pesertaPelatihan()->where('status_peserta', 'terdaftar')->count(),
            'tugas_belum_dikerjakan' => $karyawan->tugas()->where('status_pengerjaan', 'belum_dikerjakan')->count(),
            'notifikasi_belum_dibaca' => $karyawan->notifikasi()->where('status_baca', false)->count(),
        ];
    }
}
