<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Ticket extends Model {
    use HasFactory, UsesCustomId;
    public $idPrefix = 'TCK';
    public $idLength = 12;
    protected $guarded = [];
    public function user() { return $this->belongsTo(User::class); }
}