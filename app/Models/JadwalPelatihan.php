<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JadwalPelatihan extends BaseModel
{
    protected $table = 'jadwal_pelatihan';

    protected function casts(): array
    {
        return ['tanggal_pelatihan' => 'date:Y-m-d'];
    }

    public function pelatihan(): BelongsTo
    {
        return $this->belongsTo(Pelatihan::class);
    }

    public function presensi(): HasMany
    {
        return $this->hasMany(Presensi::class);
    }
}
