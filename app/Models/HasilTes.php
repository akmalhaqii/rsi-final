<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HasilTes extends BaseModel
{
    protected $table = 'hasil_tes';

    protected function casts(): array
    {
        return ['hasil_tes' => 'float', 'jawaban_tes' => 'array'];
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
