<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Hr;
use App\Http\Controllers\Karyawan;
use App\Http\Controllers\Manager;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SkillGrow API
|--------------------------------------------------------------------------
| Seluruh rute selain login memerlukan token Sanctum (Authorization: Bearer).
| Hak akses: karyawan, hr (generalisasi dari karyawan), dan manager.
*/

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware(['auth:sanctum', 'hak'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::get('dashboard', DashboardController::class);

    // ---- Karyawan (dan HR/PSDM sebagai generalisasinya) --------------------
    Route::middleware('hak:karyawan,hr')->group(function () {
        Route::controller(Karyawan\AktivitasController::class)->group(function () {
            Route::get('notifikasi', 'notifikasi');
            Route::post('notifikasi/{notifikasi}/baca', 'bacaNotifikasi');
            Route::get('target-pelatihan', 'target');
            Route::get('tugas', 'tugas');
            Route::get('jadwal-pelatihan', 'jadwal');
            Route::get('riwayat-pelatihan', 'riwayat');
        });

        Route::controller(Karyawan\PelatihanController::class)->group(function () {
            Route::get('pelatihan', 'index');
            Route::get('pelatihan-aktif', 'aktif');
            Route::get('pelatihan/{pelatihan}', 'show');
            Route::post('pelatihan/{pelatihan}/daftar', 'daftar');
            Route::get('pengajuan-pelatihan', 'pengajuan');
            Route::post('jadwal-pelatihan/{jadwal}/presensi', 'presensi');
        });

        Route::controller(Karyawan\TesController::class)
            ->prefix('pelatihan/{pelatihan}/tes/{jenis}')
            ->whereIn('jenis', ['pre_test', 'post_test'])
            ->group(function () {
                Route::get('/', 'show');
                Route::post('/', 'store');
            });

        Route::controller(Karyawan\SkillAssessmentController::class)->group(function () {
            Route::get('skill-assessment', 'form');
            Route::post('skill-assessment', 'store');
            Route::get('skill-assessment/hasil', 'hasil');
            Route::get('rekomendasi-pelatihan', 'rekomendasi');
        });
    });

    // ---- HR/PSDM -----------------------------------------------------------
    Route::middleware('hak:hr')->prefix('hr')->group(function () {
        Route::apiResource('karyawan', Hr\KaryawanController::class)
            ->parameters(['karyawan' => 'karyawan']);

        Route::apiResource('pelatihan', Hr\PelatihanController::class)
            ->parameters(['pelatihan' => 'pelatihan']);

        Route::controller(Hr\PelatihanController::class)->group(function () {
            Route::post('pelatihan/{pelatihan}/jadwal', 'simpanJadwal');
            Route::put('jadwal/{jadwal}', 'ubahJadwal');
            Route::delete('jadwal/{jadwal}', 'hapusJadwal');
            Route::post('pelatihan/{pelatihan}/materi', 'simpanMateri');
            Route::put('materi/{materi}', 'ubahMateri');
            Route::delete('materi/{materi}', 'hapusMateri');
            Route::get('pelatihan/{pelatihan}/soal', 'soal');
            Route::post('pelatihan/{pelatihan}/soal', 'simpanSoal');
            Route::delete('soal/{soal}', 'hapusSoal');
        });

        Route::controller(Hr\PesertaController::class)->group(function () {
            Route::get('pengajuan', 'pengajuan');
            Route::post('pengajuan/{pengajuan}/setujui', 'setujui');
            Route::post('pengajuan/{pengajuan}/tolak', 'tolak');
        });

        Route::controller(Hr\PesertaController::class)->prefix('pelatihan/{pelatihan}')->group(function () {
            Route::get('peserta', 'index');
            Route::post('peserta', 'store');
            Route::delete('peserta/{karyawan}', 'destroy');
            Route::get('presensi', 'presensi');
        });

        Route::controller(Hr\PemantauanController::class)->group(function () {
            Route::get('monitoring', 'monitoring');
            Route::get('skill-assessment', 'assessment');
            Route::post('skill-assessment/jadwalkan', 'jadwalkanAssessment');
            Route::get('skill-assessment/{hasilAssessment}', 'detailAssessment');
            Route::get('kinerja', 'kinerja');
            Route::get('kinerja/{karyawan}', 'detailKinerja');
            Route::put('kinerja/{karyawan}', 'simpanKinerja');
            Route::get('kpi', 'kpi');
            Route::get('kpi/{karyawan}', 'detailKpi');
            Route::get('target-pelatihan', 'target');
            Route::post('target-pelatihan', 'simpanTarget');
            Route::delete('target-pelatihan/{targetPelatihan}', 'hapusTarget');
            Route::put('target-pelatihan/{targetPelatihan}/progres/{karyawan}', 'simpanProgres');
        });
    });

    // ---- Manager -----------------------------------------------------------
    Route::middleware('hak:manager')->prefix('manager')->controller(Manager\KpiController::class)->group(function () {
        Route::get('kpi', 'index');
        Route::post('kpi', 'store');
        Route::get('target-capaian', 'targetCapaian');
        Route::post('target-capaian', 'simpanTargetCapaian');
    });
});
