<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class TargetPelatihan extends BaseModel
{
    protected $table = 'target_pelatihan';

    public function progres(): HasMany
    {
        return $this->hasMany(ProgresPelatihan::class);
    }
}
