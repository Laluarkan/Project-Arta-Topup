<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Promo extends Model {
    use HasFactory, UsesCustomId;
    public $idPrefix = 'PRM';
    public $idLength = 10;
    protected $guarded = [];
}