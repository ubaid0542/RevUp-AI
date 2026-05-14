<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'business_id',
        'ratings',
        'generated_text',
        'language',
    ];

    protected $casts = [
        'ratings' => 'array',
    ];

    /**
     * Get the business this review belongs to.
     */
    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
