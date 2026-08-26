<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Category extends Model {
    use UsesCustomId;
    public $idPrefix = 'CAT';
    public $idLength = 10;
    protected $fillable = ['name', 'icon', 'is_active'];
    public function products() { return $this->hasMany(Product::class); }
}