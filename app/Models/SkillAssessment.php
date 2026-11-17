<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkillAssessment extends BaseModel
{
    protected $table = 'skill_assessment';

    protected function casts(): array
    {
        return ['skor' => 'float'];
    }

    public function hasil(): BelongsTo
    {
        return $this->belongsTo(HasilAssessment::class, 'hasil_assessment_id');
    }
}
