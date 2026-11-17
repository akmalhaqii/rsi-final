<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NilaiKpi extends BaseModel
{
    protected $table = 'nilai_kpi';

    protected function casts(): array
    {
        return ['nilai_akhir' => 'float', 'detail_indikator' => 'array'];
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Karyawan::class);
    }
}
