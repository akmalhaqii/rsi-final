<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // DataKaryawan
        Schema::create('karyawan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('akun_id')->nullable()->unique()->constrained('akun')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('karyawan')->nullOnDelete();
            $table->string('nama_karyawan');
            $table->string('jabatan');
            $table->string('unit_kerja');
            $table->string('status_karyawan')->default('aktif'); // aktif | nonaktif
            $table->timestamps();
        });

        // DataKPI
        Schema::create('kpi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staf_id')->constrained('karyawan')->cascadeOnDelete();
            $table->string('indikator');
            $table->decimal('target_kpi', 10, 2);
            $table->decimal('data_kinerja', 10, 2);
            $table->string('status_kpi'); // Memenuhi KPI | Belum memenuhi KPI
            $table->timestamps();
            $table->unique(['staf_id', 'indikator']);
        });

        // DataTargetCapaian
        Schema::create('target_capaian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('manager_id')->constrained('karyawan')->cascadeOnDelete();
            $table->text('rincian_target');
            $table->decimal('persentase_capaian', 5, 2)->default(0);
            $table->timestamps();
        });

        // DataNotifikasi
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->string('judul_notifikasi');
            $table->text('isi_notifikasi');
            $table->dateTime('tanggal_kirim');
            $table->boolean('status_baca')->default(false);
            $table->timestamps();
        });

        // DataTargetPelatihan
        Schema::create('target_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->string('nama_target');
            $table->string('status_target')->default('aktif'); // aktif | nonaktif
            $table->timestamps();
        });

        // DataProgresPelatihan
        Schema::create('progres_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('target_pelatihan_id')->constrained('target_pelatihan')->cascadeOnDelete();
            $table->decimal('persentase_progres', 5, 2)->default(0);
            $table->string('status_progres')->default('belum_dimulai'); // belum_dimulai | berjalan | tercapai
            $table->timestamps();
            $table->unique(['karyawan_id', 'target_pelatihan_id']);
        });

        // DataRencanaPelatihan
        Schema::create('pelatihan', function (Blueprint $table) {
            $table->id();
            $table->string('nama_pelatihan');
            $table->text('deskripsi')->nullable();
            $table->date('jadwal');
            $table->unsignedInteger('kuota');
            $table->string('jenis_pelatihan')->default('umum'); // wajib | umum
            $table->string('kompetensi')->nullable(); // kompetensi yang dikembangkan, dasar rekomendasi
            $table->decimal('passing_grade', 5, 2)->nullable();
            $table->json('passing_grade_divisi')->nullable(); // {"unit kerja": nilai}
            $table->string('status_pelatihan')->default('aktif'); // rencana | aktif | selesai
            $table->timestamps();
        });

        // JadwalPelatihan (sesi)
        Schema::create('jadwal_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pelatihan_id')->constrained('pelatihan')->cascadeOnDelete();
            $table->date('tanggal_pelatihan');
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->string('lokasi'); // lokasi atau tautan daring
            $table->string('status_jadwal')->default('terjadwal'); // terjadwal | dibuka | ditutup | selesai
            $table->timestamps();
        });

        // DataPesertaPelatihan
        Schema::create('peserta_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('pelatihan_id')->constrained('pelatihan')->cascadeOnDelete();
            $table->date('tanggal_daftar');
            $table->string('sumber_pendaftaran'); // mandiri | hr
            // diajukan | ditolak (pengajuan mandiri) | terdaftar | selesai (peserta)
            $table->string('status_peserta')->default('terdaftar');
            $table->text('alasan_pengajuan')->nullable();
            $table->text('catatan_hr')->nullable();
            $table->timestamps();
            $table->unique(['karyawan_id', 'pelatihan_id']);
        });

        // DataPresensi
        Schema::create('presensi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('jadwal_pelatihan_id')->constrained('jadwal_pelatihan')->cascadeOnDelete();
            $table->string('status_presensi')->default('hadir');
            $table->dateTime('waktu_presensi');
            $table->timestamps();
            $table->unique(['karyawan_id', 'jadwal_pelatihan_id']);
        });

        // DataMateriPelatihan
        Schema::create('materi_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pelatihan_id')->constrained('pelatihan')->cascadeOnDelete();
            $table->string('judul_materi');
            $table->string('jenis_materi'); // dokumen | video | tautan | latihan_soal | zoom
            $table->string('lokasi_materi');
            $table->unsignedInteger('urutan')->default(1);
            $table->string('status_publikasi')->default('draft'); // draft | terbit
            $table->timestamps();
        });

        // Bank soal pre-test/post-test (tidak ada di model data Modul 2, dibutuhkan UC-08)
        Schema::create('soal_tes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pelatihan_id')->constrained('pelatihan')->cascadeOnDelete();
            $table->string('jenis_tes'); // pre_test | post_test
            $table->text('pertanyaan');
            $table->json('pilihan'); // {"A": "...", "B": "..."}
            $table->string('jawaban_benar');
            $table->timestamps();
        });

        // DataTugas
        Schema::create('tugas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('pelatihan_id')->nullable()->constrained('pelatihan')->cascadeOnDelete();
            $table->string('nama_tugas');
            $table->string('jenis_tugas'); // pre_test | post_test | skill_assessment
            $table->string('status_pengerjaan')->default('belum_dikerjakan'); // belum_dikerjakan | selesai
            $table->dateTime('batas_waktu')->nullable();
            $table->timestamps();
        });

        // HasilAssessment
        Schema::create('hasil_assessment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->decimal('hasil_assessment', 5, 2); // rata-rata skor
            $table->json('data_assessment'); // jawaban mentah
            $table->timestamps();
        });

        // DataSkillAssessment
        Schema::create('skill_assessment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hasil_assessment_id')->constrained('hasil_assessment')->cascadeOnDelete();
            $table->string('kompetensi');
            $table->decimal('skor', 5, 2);
            $table->string('pencapaian'); // Tercapai | Belum tercapai
            $table->string('level_kompetensi');
            $table->timestamps();
            $table->unique(['hasil_assessment_id', 'kompetensi']);
        });

        // HasilTes
        Schema::create('hasil_tes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('pelatihan_id')->constrained('pelatihan')->cascadeOnDelete();
            $table->string('jenis_tes'); // pre_test | post_test
            $table->decimal('hasil_tes', 5, 2);
            $table->json('jawaban_tes');
            $table->string('status_kelulusan')->nullable(); // lulus | tidak_lulus (post-test)
            $table->string('nomor_sertifikat')->nullable()->unique();
            $table->timestamps();
        });

        // DataRiwayatPelatihan
        Schema::create('riwayat_pelatihan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->constrained('karyawan')->cascadeOnDelete();
            $table->foreignId('pelatihan_id')->nullable()->constrained('pelatihan')->nullOnDelete();
            $table->string('nama_pelatihan');
            $table->string('jenis_pelatihan'); // wajib | mandiri
            $table->string('status_pelatihan')->default('belum_dikerjakan'); // belum_dikerjakan | on_progress | selesai
            $table->string('status_kelulusan')->nullable(); // lulus | tidak_lulus
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->timestamps();
        });

        // DataKinerja
        Schema::create('kinerja', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->unique()->constrained('karyawan')->cascadeOnDelete();
            $table->string('status_kinerja');
            $table->text('rincian_kinerja')->nullable();
            $table->timestamps();
        });

        // DataNilaiKPI
        Schema::create('nilai_kpi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('karyawan_id')->unique()->constrained('karyawan')->cascadeOnDelete();
            $table->decimal('nilai_akhir', 5, 2);
            $table->json('detail_indikator');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'nilai_kpi', 'kinerja', 'riwayat_pelatihan', 'hasil_tes', 'skill_assessment',
            'hasil_assessment', 'tugas', 'soal_tes', 'materi_pelatihan', 'presensi',
            'peserta_pelatihan', 'jadwal_pelatihan', 'pelatihan', 'progres_pelatihan',
            'target_pelatihan', 'notifikasi', 'target_capaian', 'kpi', 'karyawan',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
