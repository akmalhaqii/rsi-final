<?php

namespace Database\Seeders;

use App\Models\Akun;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Models\TargetPelatihan;
use App\Services\PelatihanService;
use Illuminate\Database\Seeder;

/**
 * Data contoh untuk pengembangan lokal. Seluruh akun memakai kata sandi
 * pada konstanta KATA_SANDI di bawah; jangan dipakai di lingkungan produksi.
 */
class DatabaseSeeder extends Seeder
{
    private const KATA_SANDI = 'password';

    public function run(PelatihanService $layanan): void
    {
        $hr = $this->karyawan('hr', Akun::HAK_HR, 'Hana Rahmawati', 'Staf PSDM', 'PSDM');
        $manager = $this->karyawan('manager', Akun::HAK_MANAGER, 'Made Wirawan', 'Manager Operasional', 'Operasional');
        $budi = $this->karyawan('budi', Akun::HAK_KARYAWAN, 'Budi Santoso', 'Staf', 'Operasional', $manager);
        $citra = $this->karyawan('citra', Akun::HAK_KARYAWAN, 'Citra Lestari', 'Staf', 'Operasional', $manager);

        $komunikasi = $this->pelatihan('Komunikasi Efektif di Tempat Kerja', 'umum', 'Komunikasi');
        $this->pelatihan('Manajemen Waktu untuk Staf', 'umum', 'Manajemen Waktu');
        $k3 = $this->pelatihan('Keselamatan dan Kesehatan Kerja', 'wajib', 'Penguasaan Teknis');

        // Pelatihan wajib: peserta ditetapkan oleh HR/PSDM.
        foreach ([$budi, $citra] as $karyawan) {
            $layanan->daftarkan($karyawan, $k3, 'hr');
        }

        $layanan->daftarkan($budi, $komunikasi, 'mandiri');

        // Contoh pengajuan yang masih menunggu persetujuan HR/PSDM.
        $layanan->ajukan($citra, $komunikasi, 'Ingin meningkatkan kemampuan komunikasi dengan pelanggan.');

        $target = TargetPelatihan::create(['nama_target' => 'Menyelesaikan 2 pelatihan pada semester ini']);

        foreach ([$budi, $citra] as $karyawan) {
            $karyawan->progresPelatihan()->create(['target_pelatihan_id' => $target->id]);
        }

        $manager->staf()->each(fn (Karyawan $staf) => $staf->targetCapaian()->create([
            'manager_id' => $manager->id,
            'rincian_target' => 'Lulus pelatihan wajib K3',
            'persentase_capaian' => 0,
        ]));

        $hr->kinerja()->create(['status_kinerja' => 'Baik', 'rincian_kinerja' => 'Data contoh']);
    }

    private function karyawan(
        string $username,
        string $hakAkses,
        string $nama,
        string $jabatan,
        string $unitKerja,
        ?Karyawan $manager = null,
    ): Karyawan {
        $akun = Akun::create([
            'username' => $username,
            'password' => self::KATA_SANDI,
            'hak_akses' => $hakAkses,
        ]);

        return Karyawan::create([
            'akun_id' => $akun->id,
            'manager_id' => $manager?->id,
            'nama_karyawan' => $nama,
            'jabatan' => $jabatan,
            'unit_kerja' => $unitKerja,
        ]);
    }

    private function pelatihan(string $nama, string $jenis, string $kompetensi): Pelatihan
    {
        $pelatihan = Pelatihan::create([
            'nama_pelatihan' => $nama,
            'deskripsi' => "Pelatihan untuk mengembangkan kompetensi {$kompetensi}.",
            'jadwal' => today()->addWeek(),
            'kuota' => 20,
            'jenis_pelatihan' => $jenis,
            'kompetensi' => $kompetensi,
            'passing_grade' => 70,
        ]);

        $pelatihan->jadwalPelatihan()->create([
            'tanggal_pelatihan' => today()->addWeek(),
            'waktu_mulai' => '09:00',
            'waktu_selesai' => '12:00',
            'lokasi' => 'Ruang Pelatihan 1',
            'status_jadwal' => 'dibuka',
        ]);

        $pelatihan->materi()->createMany([
            ['judul_materi' => "Modul {$nama}", 'jenis_materi' => 'dokumen', 'lokasi_materi' => 'materi/modul.pdf', 'urutan' => 1, 'status_publikasi' => 'terbit'],
            ['judul_materi' => 'Latihan soal perbaikan', 'jenis_materi' => 'latihan_soal', 'lokasi_materi' => 'materi/latihan.pdf', 'urutan' => 2, 'status_publikasi' => 'terbit'],
        ]);

        foreach (['pre_test', 'post_test'] as $jenisTes) {
            $pelatihan->soal()->createMany([
                [
                    'jenis_tes' => $jenisTes,
                    'pertanyaan' => "Apa tujuan utama pelatihan {$nama}?",
                    'pilihan' => ['A' => "Mengembangkan kompetensi {$kompetensi}", 'B' => 'Menambah jam lembur'],
                    'jawaban_benar' => 'A',
                ],
                [
                    'jenis_tes' => $jenisTes,
                    'pertanyaan' => 'Siapa yang menetapkan peserta pelatihan wajib?',
                    'pilihan' => ['A' => 'Karyawan sendiri', 'B' => 'HR/PSDM'],
                    'jawaban_benar' => 'B',
                ],
            ]);
        }

        return $pelatihan;
    }
}
