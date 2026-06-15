<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrScan extends Model
{
    protected $fillable = [
        'business_id', 'ip_address', 'user_agent', 'device_type',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
