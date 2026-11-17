<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Dasar seluruh model SkillGrow. Setiap masukan divalidasi di controller
 * sebelum disimpan, sehingga mass assignment tidak dibatasi di sini.
 */
abstract class BaseModel extends Model
{
    use HasFactory;

    protected $guarded = [];
}
