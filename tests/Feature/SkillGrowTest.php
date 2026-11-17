<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Karyawan;
use App\Models\Pelatihan;
use App\Services\PelatihanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SkillGrowTest extends TestCase
{
    use RefreshDatabase;

    private function sebagai(Karyawan $karyawan): Karyawan
    {
        Sanctum::actingAs($karyawan->akun);

        return $karyawan;
    }

    /** Pelatihan dengan satu sesi dan dua soal untuk tiap jenis tes. */
    private function pelatihanLengkap(array $atribut = [], string $statusJadwal = 'dibuka'): Pelatihan
    {
        $pelatihan = Pelatihan::factory()->create($atribut);

        $pelatihan->jadwalPelatihan()->create([
            'tanggal_pelatihan' => today()->addDay(),
            'waktu_mulai' => '09:00',
            'waktu_selesai' => '11:00',
            'lokasi' => 'Ruang A',
            'status_jadwal' => $statusJadwal,
        ]);

        foreach (['pre_test', 'post_test'] as $jenis) {
            foreach (['A', 'B'] as $kunci) {
                $pelatihan->soal()->create([
                    'jenis_tes' => $jenis,
                    'pertanyaan' => "Soal {$kunci}",
                    'pilihan' => ['A' => 'Satu', 'B' => 'Dua'],
                    'jawaban_benar' => $kunci,
                ]);
            }
        }

        $pelatihan->materi()->create([
            'judul_materi' => 'Latihan perbaikan',
            'jenis_materi' => 'latihan_soal',
            'lokasi_materi' => 'materi/latihan.pdf',
            'status_publikasi' => 'terbit',
        ]);

        return $pelatihan;
    }

    // ---- UC-04 Login -------------------------------------------------------

    public function test_login_berhasil_mengembalikan_token(): void
    {
        $karyawan = Karyawan::factory()->create();

        $this->postJson('/api/login', ['username' => $karyawan->akun->username, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.akun.hak_akses', 'karyawan')
            ->assertJsonStructure(['data' => ['token']])
            ->assertJsonMissingPath('data.akun.password');
    }

    public function test_login_ditolak_bila_kredensial_salah_atau_akun_nonaktif(): void
    {
        $aktif = Akun::factory()->create();
        $nonaktif = Akun::factory()->nonaktif()->create();

        $this->postJson('/api/login', ['username' => $aktif->username, 'password' => 'salah'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Username atau password salah');

        $this->postJson('/api/login', ['username' => $nonaktif->username, 'password' => 'password'])
            ->assertForbidden();
    }

    public function test_password_disimpan_sebagai_hash(): void
    {
        $akun = Akun::factory()->create();

        $this->assertNotSame('password', $akun->getRawOriginal('password'));
    }

    // ---- Hak akses ---------------------------------------------------------

    public function test_rute_dilindungi_dan_dibatasi_hak_akses(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();

        $this->sebagai(Karyawan::factory()->create());
        $this->getJson('/api/hr/karyawan')->assertForbidden();
        $this->getJson('/api/manager/kpi')->assertForbidden();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonStructure(['data' => ['pengembangan']]);

        $this->sebagai(Karyawan::factory()->manager()->create());
        $this->getJson('/api/pelatihan')->assertForbidden();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonStructure(['data' => ['tim']]);

        // HR/PSDM adalah generalisasi dari Karyawan.
        $this->sebagai(Karyawan::factory()->hr()->create());
        $this->getJson('/api/pelatihan')->assertOk();
        $this->getJson('/api/dashboard')->assertOk()->assertJsonStructure(['data' => ['pengelolaan']]);
    }

    public function test_akun_yang_dinonaktifkan_tidak_dapat_memakai_token_lama(): void
    {
        $karyawan = Karyawan::factory()->create();
        $token = $karyawan->akun->createToken('api')->plainTextToken;
        $karyawan->akun->update(['status_akun' => 'nonaktif']);

        $this->withToken($token)->getJson('/api/dashboard')->assertForbidden();
    }

    // ---- Alur pelatihan karyawan ------------------------------------------

    public function test_alur_daftar_presensi_dan_post_test_lulus(): void
    {
        $karyawan = $this->sebagai(Karyawan::factory()->create());
        $pelatihan = $this->pelatihanLengkap();
        $jadwal = $pelatihan->jadwalPelatihan()->first();

        // UC-10 mengajukan pendaftaran; belum menjadi peserta sebelum disetujui.
        $alasan = ['alasan_pengajuan' => 'Dibutuhkan untuk pekerjaan'];
        $this->postJson("/api/pelatihan/{$pelatihan->id}/daftar")->assertUnprocessable();
        $pengajuanId = $this->postJson("/api/pelatihan/{$pelatihan->id}/daftar", $alasan)
            ->assertCreated()
            ->assertJsonPath('data.status_peserta', 'diajukan')
            ->json('data.id');
        $this->postJson("/api/pelatihan/{$pelatihan->id}/daftar", $alasan)->assertUnprocessable();
        $this->getJson('/api/tugas')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson("/api/jadwal-pelatihan/{$jadwal->id}/presensi")->assertForbidden();
        $this->postJson("/api/hr/pengajuan/{$pengajuanId}/setujui")->assertForbidden();

        // HR/PSDM menyetujui pengajuan.
        $this->sebagai(Karyawan::factory()->hr()->create());
        $this->getJson('/api/hr/pengajuan')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson("/api/hr/pengajuan/{$pengajuanId}/setujui")
            ->assertOk()
            ->assertJsonPath('data.status_peserta', 'terdaftar');
        $this->postJson("/api/hr/pengajuan/{$pengajuanId}/setujui")->assertUnprocessable();

        $this->sebagai($karyawan);
        $this->getJson('/api/pengajuan-pelatihan')
            ->assertOk()
            ->assertJsonPath('data.0.status_peserta', 'terdaftar');

        $this->getJson('/api/tugas')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/pelatihan-aktif')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/notifikasi')->assertOk()->assertJsonCount(1, 'data');

        // UC-08 post-test belum memenuhi persyaratan sebelum presensi.
        $this->getJson("/api/pelatihan/{$pelatihan->id}/tes/post_test")->assertUnprocessable();

        // UC-11 presensi; pengisian kedua tidak disimpan ulang.
        $this->postJson("/api/jadwal-pelatihan/{$jadwal->id}/presensi")->assertCreated();
        $this->postJson("/api/jadwal-pelatihan/{$jadwal->id}/presensi")->assertOk();
        $this->assertDatabaseCount('presensi', 1);

        // Soal tidak membocorkan kunci jawaban.
        $soal = $this->getJson("/api/pelatihan/{$pelatihan->id}/tes/post_test")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.jawaban_benar')
            ->json('data');

        $this->postJson("/api/pelatihan/{$pelatihan->id}/tes/post_test", [
            'jawaban' => [$soal[0]['id'] => 'A', $soal[1]['id'] => 'B'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.hasil.status_kelulusan', 'lulus')
            ->assertJsonPath('data.hasil.hasil_tes', 100)
            ->assertJsonStructure(['data' => ['sertifikat' => ['nomor']]]);

        // UC-13 riwayat mencatat pelatihan mandiri yang selesai dan lulus.
        $this->getJson('/api/riwayat-pelatihan')
            ->assertOk()
            ->assertJsonPath('data.mandiri.0.status_pelatihan', 'selesai')
            ->assertJsonPath('data.mandiri.0.status_kelulusan', 'lulus');

        $this->getJson('/api/pelatihan-aktif')
            ->assertOk()
            ->assertJsonPath('message', 'Seluruh pelatihan telah diselesaikan, lihat riwayat Anda');

        $this->assertSame('selesai', $karyawan->pesertaPelatihan()->first()->status_peserta);
    }

    public function test_post_test_tidak_lulus_memberi_materi_perbaikan(): void
    {
        $karyawan = $this->sebagai(Karyawan::factory()->create());
        $pelatihan = $this->pelatihanLengkap();

        app(PelatihanService::class)->daftarkan($karyawan, $pelatihan, 'mandiri');
        $this->postJson("/api/jadwal-pelatihan/{$pelatihan->jadwalPelatihan()->first()->id}/presensi");

        $this->postJson("/api/pelatihan/{$pelatihan->id}/tes/post_test", ['jawaban' => ['0' => 'A']])
            ->assertCreated()
            ->assertJsonPath('data.hasil.status_kelulusan', 'tidak_lulus')
            ->assertJsonCount(1, 'data.materi_perbaikan')
            ->assertJsonMissingPath('data.sertifikat');
    }

    public function test_presensi_tidak_tersedia_bila_sesi_belum_dibuka(): void
    {
        $karyawan = $this->sebagai(Karyawan::factory()->create());
        $pelatihan = $this->pelatihanLengkap(statusJadwal: 'terjadwal');

        app(PelatihanService::class)->daftarkan($karyawan, $pelatihan, 'mandiri');

        $this->postJson("/api/jadwal-pelatihan/{$pelatihan->jadwalPelatihan()->first()->id}/presensi")
            ->assertUnprocessable();

        $this->assertDatabaseCount('presensi', 0);
    }

    public function test_pelatihan_wajib_tidak_dapat_didaftar_mandiri_dan_kuota_dibatasi(): void
    {
        $this->sebagai(Karyawan::factory()->create());

        $wajib = Pelatihan::factory()->wajib()->create();
        $this->postJson("/api/pelatihan/{$wajib->id}/daftar")->assertUnprocessable();

        $penuh = Pelatihan::factory()->create(['kuota' => 1]);
        app(PelatihanService::class)->daftarkan(Karyawan::factory()->create(), $penuh, 'mandiri');

        $this->postJson("/api/pelatihan/{$penuh->id}/daftar", ['alasan_pengajuan' => 'Ingin ikut'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Kuota pelatihan sudah penuh');
    }

    public function test_pengajuan_ditolak_dapat_diajukan_kembali(): void
    {
        $karyawan = $this->sebagai(Karyawan::factory()->create());
        $pelatihan = Pelatihan::factory()->create();
        $alasan = ['alasan_pengajuan' => 'Ingin mengembangkan diri'];

        $id = $this->postJson("/api/pelatihan/{$pelatihan->id}/daftar", $alasan)->json('data.id');

        $this->sebagai(Karyawan::factory()->hr()->create());
        $this->postJson("/api/hr/pengajuan/{$id}/tolak")->assertUnprocessable();
        $this->postJson("/api/hr/pengajuan/{$id}/tolak", ['catatan_hr' => 'Belum sesuai jabatan'])
            ->assertOk()
            ->assertJsonPath('data.status_peserta', 'ditolak');
        $this->getJson("/api/hr/pelatihan/{$pelatihan->id}/peserta")->assertOk()->assertJsonCount(0, 'data');

        $this->sebagai($karyawan);
        $this->getJson('/api/pengajuan-pelatihan')
            ->assertOk()
            ->assertJsonPath('data.0.status_peserta', 'ditolak')
            ->assertJsonPath('data.0.catatan_hr', 'Belum sesuai jabatan');
        $this->assertDatabaseHas('notifikasi', [
            'karyawan_id' => $karyawan->id,
            'judul_notifikasi' => 'Pengajuan pelatihan ditolak',
        ]);
        $this->assertDatabaseCount('tugas', 0);

        $this->postJson("/api/pelatihan/{$pelatihan->id}/daftar", $alasan)
            ->assertCreated()
            ->assertJsonPath('data.status_peserta', 'diajukan')
            ->assertJsonPath('data.catatan_hr', null);
        $this->assertDatabaseCount('peserta_pelatihan', 1);
    }

    // ---- Skill assessment dan rekomendasi ---------------------------------

    public function test_skill_assessment_menghasilkan_rekomendasi(): void
    {
        $this->sebagai(Karyawan::factory()->create());

        $adaPelatihan = Pelatihan::factory()->create(['kompetensi' => 'Komunikasi']);

        $jawaban = collect(config('skillgrow.kompetensi'))->map(fn ($nama) => [
            'kompetensi' => $nama,
            'skor' => in_array($nama, ['Komunikasi', 'Kepemimpinan']) ? 40 : 90,
        ])->all();

        $this->getJson('/api/rekomendasi-pelatihan')->assertOk()->assertJsonPath('data', null);

        $this->postJson('/api/skill-assessment', ['jawaban' => array_slice($jawaban, 0, 2)])
            ->assertUnprocessable();

        $this->postJson('/api/skill-assessment', ['jawaban' => $jawaban])
            ->assertCreated()
            ->assertJsonCount(6, 'data.hasil.rincian')
            ->assertJsonPath('data.rekomendasi.0.id', $adaPelatihan->id)
            ->assertJsonCount(4, 'data.kompetensi_tercover')
            ->assertJsonPath('data.kebutuhan_belum_tersedia', ['Kepemimpinan']);

        $this->getJson('/api/skill-assessment/hasil')->assertOk()->assertJsonCount(1, 'data');
    }

    // ---- HR/PSDM -----------------------------------------------------------

    public function test_hr_mengelola_karyawan(): void
    {
        $this->sebagai(Karyawan::factory()->hr()->create());

        $this->postJson('/api/hr/karyawan', ['nama_karyawan' => 'Tanpa Akun'])->assertUnprocessable();

        $id = $this->postJson('/api/hr/karyawan', [
            'nama_karyawan' => 'Dewi Anggraini',
            'jabatan' => 'Staf',
            'unit_kerja' => 'Keuangan',
            'username' => 'dewi',
            'password' => 'rahasia-123',
        ])->assertCreated()->json('data.id');

        $this->postJson('/api/hr/karyawan', [
            'nama_karyawan' => 'Dewi Kedua',
            'jabatan' => 'Staf',
            'unit_kerja' => 'Keuangan',
            'username' => 'dewi',
            'password' => 'rahasia-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');

        $this->getJson('/api/hr/karyawan?q=Dewi')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/hr/karyawan?q=tidak-ada')->assertOk()
            ->assertJsonPath('message', 'Data karyawan tidak ditemukan');

        $this->putJson("/api/hr/karyawan/{$id}", ['jabatan' => 'Analis'])
            ->assertOk()->assertJsonPath('data.jabatan', 'Analis');

        $this->deleteJson("/api/hr/karyawan/{$id}")->assertOk();
        $this->assertDatabaseHas('akun', ['username' => 'dewi', 'status_akun' => 'nonaktif']);
    }

    public function test_hr_mengelola_pelatihan_peserta_dan_monitoring(): void
    {
        $this->sebagai(Karyawan::factory()->hr()->create());
        $peserta = Karyawan::factory()->create();

        $this->postJson('/api/hr/pelatihan', ['nama_pelatihan' => 'Tanpa Jadwal'])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Data tidak lengkap, mohon isi seluruh kolom (and 1 more error)');

        $id = $this->postJson('/api/hr/pelatihan', [
            'nama_pelatihan' => 'K3 Dasar',
            'jadwal' => today()->addWeek()->toDateString(),
            'kuota' => 10,
            'jenis_pelatihan' => 'wajib',
        ])->assertCreated()->json('data.id');

        $jadwalId = $this->postJson("/api/hr/pelatihan/{$id}/jadwal", [
            'tanggal_pelatihan' => today()->addWeek()->toDateString(),
            'waktu_mulai' => '09:00',
            'waktu_selesai' => '12:00',
            'lokasi' => 'Aula',
        ])->assertCreated()->json('data.id');

        $this->postJson("/api/hr/pelatihan/{$id}/peserta", ['karyawan_ids' => [$peserta->id]])
            ->assertCreated()
            ->assertJsonPath('data.0.sumber_pendaftaran', 'hr');

        // Perubahan jadwal memberi tahu peserta (UC-03).
        $this->putJson("/api/hr/jadwal/{$jadwalId}", ['lokasi' => 'Ruang B', 'status_jadwal' => 'dibuka'])->assertOk();
        $this->assertDatabaseHas('notifikasi', [
            'karyawan_id' => $peserta->id,
            'judul_notifikasi' => 'Perubahan jadwal pelatihan',
        ]);

        $this->getJson('/api/hr/monitoring')
            ->assertOk()
            ->assertJsonPath('data.0.jumlah_peserta', 1)
            ->assertJsonPath('data.0.sesi.0.status_jadwal', 'dibuka');

        $this->deleteJson("/api/hr/pelatihan/{$id}/peserta/{$peserta->id}")->assertOk();
        $this->assertDatabaseCount('peserta_pelatihan', 0);
        $this->assertDatabaseCount('tugas', 0);

        $this->deleteJson("/api/hr/pelatihan/{$id}")->assertOk();
        $this->assertDatabaseCount('jadwal_pelatihan', 0);
    }

    // ---- Manager -----------------------------------------------------------

    public function test_manager_menilai_kpi_staf_dan_hr_meninjau(): void
    {
        $manager = $this->sebagai(Karyawan::factory()->manager()->create());
        $staf = Karyawan::factory()->create(['manager_id' => $manager->id]);
        $bukanStaf = Karyawan::factory()->create();

        $this->postJson('/api/manager/kpi', [
            'staf_id' => $staf->id,
            'indikator' => [['indikator' => 'Kehadiran', 'target_kpi' => 100]],
        ])->assertUnprocessable()->assertJsonPath('message', 'Indikator KPI belum lengkap');

        $this->postJson('/api/manager/kpi', [
            'staf_id' => $bukanStaf->id,
            'indikator' => [['indikator' => 'Kehadiran', 'target_kpi' => 100, 'data_kinerja' => 100]],
        ])->assertForbidden();

        $this->postJson('/api/manager/kpi', [
            'staf_id' => $staf->id,
            'indikator' => [
                ['indikator' => 'Kehadiran', 'target_kpi' => 100, 'data_kinerja' => 100],
                ['indikator' => 'Jam pelatihan', 'target_kpi' => 20, 'data_kinerja' => 10],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.status_kpi', 'Belum memenuhi KPI')
            ->assertJsonPath('data.nilai_kpi.nilai_akhir', 75);

        $this->getJson('/api/manager/target-capaian')
            ->assertOk()
            ->assertJsonPath('message', 'Belum ada target pelatihan yang ditetapkan');

        $this->postJson('/api/manager/target-capaian', [
            'karyawan_id' => $staf->id,
            'rincian_target' => 'Lulus K3',
            'persentase_capaian' => 50,
        ])->assertCreated();

        $this->getJson('/api/manager/target-capaian')
            ->assertOk()
            ->assertJsonPath('data.0.persentase_capaian', 50);

        // UC-20 HR meninjau nilai KPI dari Manager.
        $this->sebagai(Karyawan::factory()->hr()->create());
        $this->getJson('/api/hr/kpi')->assertOk()->assertJsonPath('data.0.karyawan_id', $staf->id);
    }
}
