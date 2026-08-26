<?php

namespace App\Traits;

use Illuminate\Support\Str;

/**
 * @method static void creating(\Closure $callback)
 */

trait UsesCustomId
{
    public function initializeUsesCustomId()
    {
        $this->incrementing = false;
        $this->keyType = 'string';
    }

    protected static function bootUsesCustomId()
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $prefix = $model->idPrefix ?? 'ID';
                $length = $model->idLength ?? 10;
                $model->{$model->getKeyName()} = $prefix . '-' . Str::random($length);
            }
        });
    }
}