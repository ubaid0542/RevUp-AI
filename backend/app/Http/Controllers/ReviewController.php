<?php

namespace App\Http\Controllers;

use App\Models\Business;
use App\Models\Review;
use App\Services\ReviewGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    protected ReviewGeneratorService $generator;

    public function __construct(ReviewGeneratorService $generator)
    {
        $this->generator = $generator;
    }

    /**
     * Generate a review based on star ratings.
     */
    public function generate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'business_id' => 'required|exists:businesses,id',
            'ratings' => 'required|array',
            'ratings.overall' => 'required|integer|min:1|max:5',
            'ratings.quality' => 'nullable|integer|min:1|max:5',
            'ratings.service' => 'nullable|integer|min:1|max:5',
            'ratings.value' => 'nullable|integer|min:1|max:5',
            'ratings.ambience' => 'nullable|integer|min:1|max:5',
            'ratings.recommend' => 'nullable|integer|min:1|max:5',
            'language' => 'nullable|string|in:hinglish,english',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $business = Business::findOrFail($request->business_id);
        $language = $request->language ?? 'hinglish';

        $generatedText = $this->generator->generate(
            businessName: $business->name,
            businessType: $business->type,
            ratings: $request->ratings,
            language: $language
        );

        $review = Review::create([
            'business_id' => $business->id,
            'ratings' => $request->ratings,
            'generated_text' => $generatedText,
            'language' => $language,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'review' => $review,
                'text' => $generatedText,
            ],
        ]);
    }

    /**
     * Regenerate a review with the same ratings but different text.
     */
    public function regenerate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'business_id' => 'required|exists:businesses,id',
            'ratings' => 'required|array',
            'ratings.overall' => 'required|integer|min:1|max:5',
            'language' => 'nullable|string|in:hinglish,english',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $business = Business::findOrFail($request->business_id);
        $language = $request->language ?? 'hinglish';

        $generatedText = $this->generator->generate(
            businessName: $business->name,
            businessType: $business->type,
            ratings: $request->ratings,
            language: $language
        );

        $review = Review::create([
            'business_id' => $business->id,
            'ratings' => $request->ratings,
            'generated_text' => $generatedText,
            'language' => $language,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'review' => $review,
                'text' => $generatedText,
            ],
        ]);
    }

    /**
     * Get review generation history for a business.
     */
    public function history(int $businessId): JsonResponse
    {
        $reviews = Review::where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $reviews,
        ]);
    }
}
