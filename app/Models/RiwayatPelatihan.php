<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RiwayatPelatihan extends BaseModel
{
    protected $table = 'riwayat_pelatihan';

    protected function casts(): array
    {
        return ['tanggal_mulai' => 'date:Y-m-d', 'tanggal_selesai' => 'date:Y-m-d'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }

    public function pelatihan(): BelongsTo
    {
        return $this->belongsTo(Pelatihan::class);
    }
}
