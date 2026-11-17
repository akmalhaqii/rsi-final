<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notifikasi extends BaseModel
{
    protected $table = 'notifikasi';

    protected function casts(): array
    {
        return ['tanggal_kirim' => 'datetime', 'status_baca' => 'boolean'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }
}
