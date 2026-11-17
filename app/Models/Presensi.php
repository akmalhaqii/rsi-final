<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Presensi extends BaseModel
{
    protected $table = 'presensi';

    protected function casts(): array
    {
        return ['waktu_presensi' => 'datetime'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }

    public function jadwal(): BelongsTo
    {
        return $this->belongsTo(JadwalPelatihan::class, 'jadwal_pelatihan_id');
    }
}
