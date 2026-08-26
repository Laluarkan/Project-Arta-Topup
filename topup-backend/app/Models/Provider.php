<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Provider extends Model {
    use UsesCustomId;
    public $idPrefix = 'PRV';
    public $idLength = 10;
    protected $fillable = ['name', 'api_config', 'is_active'];
    protected $casts = ['api_config' => 'array', 'is_active' => 'boolean'];
    public function products() { return $this->hasMany(Product::class); }
}