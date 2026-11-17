<?php

namespace App\Services;

use App\Models\Karyawan;
use App\Models\Notifikasi;
use App\Models\Pelatihan;
use App\Models\PesertaPelatihan;
use App\Models\RiwayatPelatihan;
use App\Models\Tugas;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PelatihanService
{
    /**
     * Pengajuan pendaftaran mandiri oleh karyawan (UC-10). Karyawan baru
     * menjadi peserta setelah pengajuan disetujui HR/PSDM.
     */
    public function ajukan(Karyawan $karyawan, Pelatihan $pelatihan, string $alasan): PesertaPelatihan
    {
        return DB::transaction(function () use ($karyawan, $pelatihan, $alasan) {
            $this->pastikanBisaDidaftarkan($karyawan, $pelatihan);

            $menunggu = $karyawan->pengajuanPelatihan()
                ->where('pelatihan_id', $pelatihan->id)
                ->where('status_peserta', 'diajukan')
                ->exists();

            if ($menunggu) {
                throw ValidationException::withMessages([
                    'pelatihan' => 'Pengajuan Anda masih menunggu persetujuan HR/PSDM',
                ]);
            }

            // Pengajuan yang pernah ditolak boleh diajukan kembali.
            return PesertaPelatihan::updateOrCreate(
                ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id],
                [
                    'tanggal_daftar' => today(),
                    'sumber_pendaftaran' => 'mandiri',
                    'status_peserta' => 'diajukan',
                    'alasan_pengajuan' => $alasan,
                    'catatan_hr' => null,
                ],
            );
        });
    }

    /** HR/PSDM menyetujui pengajuan: karyawan menjadi peserta. */
    public function setujui(PesertaPelatihan $pengajuan, ?string $catatan = null): PesertaPelatihan
    {
        $this->pastikanMenunggu($pengajuan);

        return DB::transaction(function () use ($pengajuan, $catatan) {
            $peserta = $this->daftarkan($pengajuan->karyawan, $pengajuan->pelatihan, 'mandiri');
            $peserta->update(['catatan_hr' => $catatan]);

            return $peserta;
        });
    }

    /** HR/PSDM menolak pengajuan. */
    public function tolak(PesertaPelatihan $pengajuan, string $catatan): PesertaPelatihan
    {
        $this->pastikanMenunggu($pengajuan);

        return DB::transaction(function () use ($pengajuan, $catatan) {
            $pengajuan->update(['status_peserta' => 'ditolak', 'catatan_hr' => $catatan]);

            $this->kirimNotifikasi(
                [$pengajuan->karyawan_id],
                'Pengajuan pelatihan ditolak',
                "Pengajuan Anda pada pelatihan {$pengajuan->pelatihan->nama_pelatihan} ditolak: {$catatan}",
            );

            return $pengajuan;
        });
    }

    /**
     * Menjadikan karyawan peserta (penetapan oleh HR pada UC-16, atau
     * pengajuan mandiri yang disetujui), sekaligus menyiapkan riwayat,
     * tugas pre-test/post-test, dan notifikasi.
     */
    public function daftarkan(Karyawan $karyawan, Pelatihan $pelatihan, string $sumber): PesertaPelatihan
    {
        return DB::transaction(function () use ($karyawan, $pelatihan, $sumber) {
            $this->pastikanBisaDidaftarkan($karyawan, $pelatihan);

            $peserta = PesertaPelatihan::updateOrCreate(
                ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id],
                [
                    'tanggal_daftar' => today(),
                    'sumber_pendaftaran' => $sumber,
                    'status_peserta' => 'terdaftar',
                ],
            );

            RiwayatPelatihan::updateOrCreate(
                ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id],
                [
                    'nama_pelatihan' => $pelatihan->nama_pelatihan,
                    'jenis_pelatihan' => $pelatihan->jenisRiwayat(),
                    'status_pelatihan' => 'belum_dikerjakan',
                    'status_kelulusan' => null,
                    'tanggal_mulai' => $pelatihan->jadwal,
                    'tanggal_selesai' => null,
                ],
            );

            foreach (['pre_test' => 'Pre-test', 'post_test' => 'Post-test'] as $jenis => $label) {
                Tugas::firstOrCreate(
                    ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id, 'jenis_tugas' => $jenis],
                    ['nama_tugas' => "{$label}: {$pelatihan->nama_pelatihan}", 'status_pengerjaan' => 'belum_dikerjakan'],
                );
            }

            $this->kirimNotifikasi(
                [$karyawan->id],
                'Pendaftaran pelatihan',
                $sumber === 'hr'
                    ? "Anda didaftarkan oleh HR/PSDM pada pelatihan {$pelatihan->nama_pelatihan}."
                    : "Pengajuan Anda pada pelatihan {$pelatihan->nama_pelatihan} disetujui.",
            );

            return $peserta;
        });
    }

    private function pastikanBisaDidaftarkan(Karyawan $karyawan, Pelatihan $pelatihan): void
    {
        if ($karyawan->pesertaDari($pelatihan)) {
            throw ValidationException::withMessages([
                'pelatihan' => "{$karyawan->nama_karyawan} sudah terdaftar pada pelatihan ini",
            ]);
        }

        if ($pelatihan->peserta()->count() >= $pelatihan->kuota) {
            throw ValidationException::withMessages([
                'pelatihan' => 'Kuota pelatihan sudah penuh',
            ]);
        }
    }

    private function pastikanMenunggu(PesertaPelatihan $pengajuan): void
    {
        if ($pengajuan->status_peserta !== 'diajukan') {
            throw ValidationException::withMessages([
                'pengajuan' => 'Pengajuan ini sudah diproses',
            ]);
        }
    }

    /** Mengeluarkan karyawan dari pelatihan (UC-16 un-assign). */
    public function keluarkan(Karyawan $karyawan, Pelatihan $pelatihan): void
    {
        DB::transaction(function () use ($karyawan, $pelatihan) {
            $kunci = ['karyawan_id' => $karyawan->id, 'pelatihan_id' => $pelatihan->id];

            PesertaPelatihan::where($kunci)->delete();
            Tugas::where($kunci)->where('status_pengerjaan', 'belum_dikerjakan')->delete();
            RiwayatPelatihan::where($kunci)->where('status_pelatihan', 'belum_dikerjakan')->delete();

            $this->kirimNotifikasi(
                [$karyawan->id],
                'Perubahan peserta pelatihan',
                "Anda tidak lagi terdaftar pada pelatihan {$pelatihan->nama_pelatihan}.",
            );
        });
    }

    /**
     * Mengirim notifikasi ke sejumlah karyawan (UC-03).
     *
     * @param  iterable<int>  $karyawanIds
     */
    public function kirimNotifikasi(iterable $karyawanIds, string $judul, string $isi): void
    {
        $sekarang = now();
        $baris = [];

        foreach ($karyawanIds as $id) {
            $baris[] = [
                'karyawan_id' => $id,
                'judul_notifikasi' => $judul,
                'isi_notifikasi' => $isi,
                'tanggal_kirim' => $sekarang,
                'status_baca' => false,
                'created_at' => $sekarang,
                'updated_at' => $sekarang,
            ];
        }

        foreach (array_chunk($baris, 500) as $potongan) {
            Notifikasi::insert($potongan);
        }
    }
}
