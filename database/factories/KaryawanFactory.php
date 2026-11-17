<?php

namespace Database\Factories;

use App\Models\Akun;
use App\Models\Karyawan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Karyawan>
 */
class KaryawanFactory extends Factory
{
    protected $model = Karyawan::class;

    public function definition(): array
    {
        return [
            'akun_id' => Akun::factory(),
            'nama_karyawan' => fake()->name(),
            'jabatan' => fake()->randomElement(['Staf', 'Supervisor', 'Analis']),
            'unit_kerja' => fake()->randomElement(['Operasional', 'Keuangan', 'Teknologi Informasi']),
            'status_karyawan' => 'aktif',
        ];
    }

    public function hr(): static
    {
        return $this->state(['akun_id' => Akun::factory()->hr(), 'jabatan' => 'Staf PSDM', 'unit_kerja' => 'PSDM']);
    }

    public function manager(): static
    {
        return $this->state(['akun_id' => Akun::factory()->manager(), 'jabatan' => 'Manager']);
    }
}
