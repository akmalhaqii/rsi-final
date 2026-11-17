<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TargetCapaian extends BaseModel
{
    protected $table = 'target_capaian';

    protected function casts(): array
    {
        return ['persentase_capaian' => 'float'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class, 'manager_id');
    }
}
