<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MateriPelatihan extends BaseModel
{
    protected $table = 'materi_pelatihan';

    protected function casts(): array
    {
        return ['urutan' => 'integer'];
    }

    public function pelatihan(): BelongsTo
    {
        return $this->belongsTo(Pelatihan::class);
    }
}
