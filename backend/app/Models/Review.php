<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id', 'ratings', 'generated_text', 'language', 'source', 'stars', 'photos', 'is_posted',
        'reply_text', 'reply_status', 'replied_at',
    ];

    protected $casts = [
        'ratings' => 'array',
        'photos' => 'array',
        'is_posted' => 'boolean',
        'replied_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
