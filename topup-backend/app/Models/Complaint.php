<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\UsesCustomId;
class Complaint extends Model {
    use UsesCustomId;
    public $idPrefix = 'CPL';
    public $idLength = 12;
    protected $fillable = ['trx_id', 'user_id', 'message', 'status', 'admin_response', 'handled_by'];
    public function transaction() { return $this->belongsTo(Transaction::class, 'trx_id', 'trx_id'); }
    public function user() { return $this->belongsTo(User::class); }
    public function handledBy() { return $this->belongsTo(User::class, 'handled_by'); }
}