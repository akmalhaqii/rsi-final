<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PesertaPelatihan extends BaseModel
{
    /** Status yang berarti karyawan sudah menjadi peserta pelatihan. */
    public const STATUS_PESERTA = ['terdaftar', 'selesai'];

    protected $table = 'peserta_pelatihan';

    protected function casts(): array
    {
        return ['tanggal_daftar' => 'date:Y-m-d'];
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
