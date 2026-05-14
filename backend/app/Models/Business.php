<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'logo_path',
        'google_place_id',
    ];

    /**
     * Get all reviews generated for this business.
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
