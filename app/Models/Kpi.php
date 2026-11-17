<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Kpi extends BaseModel
{
    protected $table = 'kpi';

    protected function casts(): array
    {
        return ['target_kpi' => 'float', 'data_kinerja' => 'float'];
    }

    public function staf(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class, 'staf_id');
    }
}
