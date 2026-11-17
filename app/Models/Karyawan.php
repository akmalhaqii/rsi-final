<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Karyawan extends BaseModel
{
    protected $table = 'karyawan';

    public function akun(): BelongsTo
    {
        return $this->belongsTo(Akun::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(self::class, 'manager_id');
    }

    public function staf(): HasMany
    {
        return $this->hasMany(self::class, 'manager_id');
    }

    public function kpi(): HasMany
    {
        return $this->hasMany(Kpi::class, 'staf_id');
    }

    public function nilaiKpi(): HasOne
    {
        return $this->hasOne(NilaiKpi::class);
    }

    public function kinerja(): HasOne
    {
        return $this->hasOne(Kinerja::class);
    }

    public function targetCapaian(): HasMany
    {
        return $this->hasMany(TargetCapaian::class);
    }

    public function notifikasi(): HasMany
    {
        return $this->hasMany(Notifikasi::class);
    }

    public function progresPelatihan(): HasMany
    {
        return $this->hasMany(ProgresPelatihan::class);
    }

    public function tugas(): HasMany
    {
        return $this->hasMany(Tugas::class);
    }

    public function hasilAssessment(): HasMany
    {
        return $this->hasMany(HasilAssessment::class);
    }

    public function assessmentTerakhir(): HasOne
    {
        return $this->hasOne(HasilAssessment::class)->latestOfMany();
    }

    public function hasilTes(): HasMany
    {
        return $this->hasMany(HasilTes::class);
    }

    /** Kepesertaan yang sudah disetujui atau ditetapkan HR/PSDM. */
    public function pesertaPelatihan(): HasMany
    {
        return $this->pengajuanPelatihan()->whereIn('status_peserta', PesertaPelatihan::STATUS_PESERTA);
    }

    /** Seluruh pendaftaran, termasuk pengajuan yang menunggu atau ditolak. */
    public function pengajuanPelatihan(): HasMany
    {
        return $this->hasMany(PesertaPelatihan::class);
    }

    public function presensi(): HasMany
    {
        return $this->hasMany(Presensi::class);
    }

    public function riwayatPelatihan(): HasMany
    {
        return $this->hasMany(RiwayatPelatihan::class);
    }

    public function pesertaDari(Pelatihan $pelatihan): bool
    {
        return $this->pesertaPelatihan()->where('pelatihan_id', $pelatihan->id)->exists();
    }
}
