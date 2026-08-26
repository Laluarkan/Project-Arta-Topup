<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Setting extends Model {
    use UsesCustomId;
    public $idPrefix = 'SET';
    public $idLength = 8;
    protected $fillable = ['key', 'value'];
    public $timestamps = false;
}