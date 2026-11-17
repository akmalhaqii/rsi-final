<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Skill assessment
    |--------------------------------------------------------------------------
    |
    | Daftar kompetensi yang dinilai pada formulir skill assessment (UC-07),
    | standar skor minimal agar kompetensi dianggap tercapai, dan batas
    | skor untuk setiap level kompetensi (diurutkan dari yang tertinggi).
    |
    */

    'kompetensi' => [
        'Komunikasi',
        'Kerja Sama Tim',
        'Pemecahan Masalah',
        'Kepemimpinan',
        'Penguasaan Teknis',
        'Manajemen Waktu',
    ],

    'standar_kompetensi' => 70,

    // Standar khusus per jabatan: ['Supervisor' => ['Kepemimpinan' => 80]]
    'standar_jabatan' => [],

    'level' => [
        ['min' => 85, 'nama' => 'Mahir'],
        ['min' => 70, 'nama' => 'Menengah'],
        ['min' => 50, 'nama' => 'Dasar'],
        ['min' => 0, 'nama' => 'Pemula'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Evaluasi pelatihan
    |--------------------------------------------------------------------------
    |
    | Passing grade bawaan post-test bila pelatihan tidak menetapkannya.
    |
    */

    'passing_grade' => 70,

];
