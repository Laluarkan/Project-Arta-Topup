<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Notification extends Model {
    use UsesCustomId;
    public $idPrefix = 'NOTIF';
    public $idLength = 15;
    protected $fillable = ['user_id', 'type', 'channel', 'message', 'is_read', 'sent_at'];
    protected $casts = ['is_read' => 'boolean', 'sent_at' => 'datetime'];
    public function user() { return $this->belongsTo(User::class); }
}