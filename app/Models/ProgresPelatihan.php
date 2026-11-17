<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgresPelatihan extends BaseModel
{
    protected $table = 'progres_pelatihan';

    protected function casts(): array
    {
        return ['persentase_progres' => 'float'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(TargetPelatihan::class, 'target_pelatihan_id');
    }
}
