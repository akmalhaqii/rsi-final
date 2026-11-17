<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HasilAssessment extends BaseModel
{
    protected $table = 'hasil_assessment';

    protected function casts(): array
    {
        return ['hasil_assessment' => 'float', 'data_assessment' => 'array'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }

    public function rincian(): HasMany
    {
        return $this->hasMany(SkillAssessment::class);
    }
}
