<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class AuditLog extends Model {
    use HasFactory, UsesCustomId;
    public $idPrefix = 'LOG';
    public $idLength = 15;
    protected $guarded = [];
    public function user() { return $this->belongsTo(User::class); }
}