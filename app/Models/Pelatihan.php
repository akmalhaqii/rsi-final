<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Pelatihan extends BaseModel
{
    protected $table = 'pelatihan';

    protected function casts(): array
    {
        return [
            'jadwal' => 'date:Y-m-d',
            'kuota' => 'integer',
            'passing_grade' => 'float',
            'passing_grade_divisi' => 'array',
        ];
    }

    public function jadwalPelatihan(): HasMany
    {
        return $this->hasMany(JadwalPelatihan::class);
    }

    /** Peserta yang sudah disetujui atau ditetapkan HR/PSDM. */
    public function peserta(): HasMany
    {
        return $this->pengajuan()->whereIn('status_peserta', PesertaPelatihan::STATUS_PESERTA);
    }

    /** Seluruh pendaftaran, termasuk pengajuan yang menunggu atau ditolak. */
    public function pengajuan(): HasMany
    {
        return $this->hasMany(PesertaPelatihan::class);
    }

    public function materi(): HasMany
    {
        return $this->hasMany(MateriPelatihan::class)->orderBy('urutan');
    }

    public function soal(): HasMany
    {
        return $this->hasMany(SoalTes::class);
    }

    public function hasilTes(): HasMany
    {
        return $this->hasMany(HasilTes::class);
    }

    /**
     * Passing grade post-test: nilai khusus divisi karyawan bila ditetapkan,
     * lalu nilai pelatihan, lalu nilai bawaan sistem.
     */
    public function passingGradeUntuk(Karyawan $karyawan): float
    {
        return (float) ($this->passing_grade_divisi[$karyawan->unit_kerja]
            ?? $this->passing_grade
            ?? config('skillgrow.passing_grade'));
    }

    /** Jenis pelatihan pada riwayat: wajib atau mandiri. */
    public function jenisRiwayat(): string
    {
        return $this->jenis_pelatihan === 'wajib' ? 'wajib' : 'mandiri';
    }
}
