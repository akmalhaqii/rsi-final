<?php

namespace Database\Factories;

use App\Models\Akun;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Akun>
 */
class AkunFactory extends Factory
{
    protected $model = Akun::class;

    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'password' => 'password',
            'status_akun' => 'aktif',
            'hak_akses' => Akun::HAK_KARYAWAN,
        ];
    }

    public function hr(): static
    {
        return $this->state(['hak_akses' => Akun::HAK_HR]);
    }

    public function manager(): static
    {
        return $this->state(['hak_akses' => Akun::HAK_MANAGER]);
    }

    public function nonaktif(): static
    {
        return $this->state(['status_akun' => 'nonaktif']);
    }
}
