<?php

namespace App\Models;

use Database\Factories\AkunFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Akun extends Authenticatable
{
    /** @use HasFactory<AkunFactory> */
    use HasApiTokens, HasFactory;

    public const HAK_KARYAWAN = 'karyawan';

    public const HAK_HR = 'hr';

    public const HAK_MANAGER = 'manager';

    public const HAK_AKSES = [self::HAK_KARYAWAN, self::HAK_HR, self::HAK_MANAGER];

    protected $table = 'akun';

    protected $fillable = ['username', 'password', 'status_akun', 'hak_akses'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['password' => 'hashed'];
    }

    public function karyawan(): HasOne
    {
        return $this->hasOne(Karyawan::class);
    }

    public function aktif(): bool
    {
        return $this->status_akun === 'aktif';
    }
}
