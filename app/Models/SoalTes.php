<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SoalTes extends BaseModel
{
    protected $table = 'soal_tes';

    protected $hidden = ['jawaban_benar'];

    protected function casts(): array
    {
        return ['pilihan' => 'array'];
    }

    public function pelatihan(): BelongsTo
    {
        return $this->belongsTo(Pelatihan::class);
    }
}
