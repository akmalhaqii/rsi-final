<?php

namespace Database\Factories;

use App\Models\Pelatihan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pelatihan>
 */
class PelatihanFactory extends Factory
{
    protected $model = Pelatihan::class;

    public function definition(): array
    {
        return [
            'nama_pelatihan' => 'Pelatihan '.fake()->unique()->words(2, true),
            'deskripsi' => fake()->sentence(),
            'jadwal' => today()->addWeek(),
            'kuota' => 20,
            'jenis_pelatihan' => 'umum',
            'kompetensi' => 'Komunikasi',
            'passing_grade' => 70,
            'status_pelatihan' => 'aktif',
        ];
    }

    public function wajib(): static
    {
        return $this->state(['jenis_pelatihan' => 'wajib']);
    }
}
