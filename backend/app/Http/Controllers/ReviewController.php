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
            'subcategory' => 'nullable|string|max:255',
            'customer_keywords' => 'nullable|string|max:500',
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
            language: $language,
            options: [
                'businessSubcategory' => $request->subcategory,
                'customerKeywords' => $request->customer_keywords,
            ]
        );

        $review = Review::create([
            'business_id' => $business->id,
            'ratings' => $request->ratings,
            'generated_text' => $generatedText,
            'language' => $language,
            'source' => 'Backend API (Laravel)',
            'stars' => $request->ratings['overall'] ?? 4,
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
            'previous_text' => 'nullable|string|max:2000',
            'variation_seed' => 'nullable|string|max:100',
            'subcategory' => 'nullable|string|max:255',
            'customer_keywords' => 'nullable|string|max:500',
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
            language: $language,
            options: [
                'regenerate' => true,
                'previous_text' => $request->previous_text,
                'variation_seed' => $request->variation_seed ?? (string) microtime(true),
                'businessSubcategory' => $request->subcategory,
                'customerKeywords' => $request->customer_keywords,
            ]
        );

        $review = Review::create([
            'business_id' => $business->id,
            'ratings' => $request->ratings,
            'generated_text' => $generatedText,
            'language' => $language,
            'source' => 'Backend API (Laravel)',
            'stars' => $request->ratings['overall'] ?? 4,
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
     * Get review generation history for a business (owner only).
     * Auth enforced at route level (auth:sanctum).
     */
    public function history(int $businessId): JsonResponse
    {
        $business = Business::find($businessId);

        if (!$business) {
            return response()->json(['success' => false, 'message' => 'Business not found.'], 404);
        }

        // Only owner can view their business history
        if ($business->user_id && $business->user_id !== request()->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        $reviews = Review::where('business_id', $businessId)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get(['id', 'ratings', 'generated_text', 'language', 'stars', 'source', 'created_at']);

        return response()->json([
            'success' => true,
            'data'    => $reviews,
        ]);
    }

    /**
     * Save an externally generated review (OpenRouter, Gemini, or Local fallback)
     * POST /api/reviews/save-external
     */
    public function saveExternal(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'business_id' => 'required|exists:businesses,id',
            'ratings' => 'required|array',
            'generated_text' => 'required|string',
            'language' => 'nullable|string',
            'source' => 'nullable|string',
            'stars' => 'nullable|integer|min:1|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $business = Business::findOrFail($request->business_id);

        $review = Review::create([
            'business_id' => $business->id,
            'ratings' => $request->ratings,
            'generated_text' => $request->generated_text,
            'language' => $request->language ?? 'hinglish',
            'source' => $request->source ?? 'External API',
            'stars' => $request->stars ?? 4,
            'photos' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $review,
        ]);
    }

    /**
     * Generate a review via backend proxy (no DB ID required).
     * POST /api/reviews/generate-proxy
     *
     * Frontend sends business_name + business_type directly.
     * API keys stay server-side — never exposed to browser.
     */
    public function generateProxy(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'business_name' => 'required|string|max:255',
            'business_type' => 'required|string|max:255',
            'ratings'       => 'required|array',
            'language'      => 'nullable|string|in:hinglish,english',
            'subcategory'   => 'nullable|string|max:255',
            'options'       => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $language = $request->language ?? 'hinglish';
        $options  = $request->options ?? [];
        if ($request->subcategory) {
            $options['businessSubcategory'] = $request->subcategory;
        }

        $generatedText = $this->generator->generate(
            businessName: $request->business_name,
            businessType: $request->business_type,
            ratings: $request->ratings,
            language: $language,
            options: $options
        );

        if (empty($generatedText)) {
            return response()->json([
                'success' => false,
                'message' => 'AI could not generate a review. Please try again.',
            ], 503);
        }

        return response()->json([
            'success' => true,
            'data'    => ['text' => $generatedText],
        ]);
    }

    /**
     * Upload photos for a review (supports base64 image data strings)
     * POST /api/reviews/{review}/photos
     */
    public function uploadPhotos(Request $request, Review $review): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'photos' => 'required|array',
            'photos.*' => 'required|string', // base64 representation
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Max 5 photos per request
        if (count($request->photos) > 5) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum 5 photos allowed per upload.',
            ], 422);
        }

        $paths = $review->photos ?? [];
        
        foreach ($request->photos as $base64Data) {
            if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
                $data = substr($base64Data, strpos($base64Data, ',') + 1);
                $type = strtolower($type[1]); // jpg, png, webp, etc.

                if (!in_array($type, ['jpg', 'jpeg', 'gif', 'png', 'webp'])) {
                    continue;
                }
                $decoded = base64_decode($data);

                if ($decoded === false) {
                    continue;
                }

                // Reject files larger than 5MB
                if (strlen($decoded) > 5 * 1024 * 1024) {
                    continue;
                }
                
                $filename = uniqid() . '.' . $type;
                // Save to 'reviews' folder in public disk
                \Illuminate\Support\Facades\Storage::disk('public')->put('reviews/' . $filename, $decoded);
                $paths[] = '/storage/reviews/' . $filename;
            }
        }

        $review->update(['photos' => $paths]);

        return response()->json([
            'success' => true,
            'data' => [
                'photos' => $paths,
                'review' => $review,
            ],
        ]);
    }

    /**
     * Mark a review as posted to Google
     * POST /api/reviews/{review}/posted
     */
    public function markPosted(Request $request, Review $review): JsonResponse
    {
        \Log::info('markPosted hit for review: ' . $review->id);
        
        $review->update([
            'is_posted' => true,
            'generated_text' => $request->text ?? $review->generated_text,
        ]);
        
        \Log::info('Review updated. is_posted is now: ' . $review->is_posted);

        return response()->json([
            'success' => true,
            'message' => 'Review marked as posted.',
            'data' => $review,
        ]);
    }

    /**
     * Generate AI reply for a review (Growth/Pro plan only)
     */
    public function generateReply(Request $request, Review $review): JsonResponse
    {
        // 1. Get the business and check ownership
        $business = $review->business;
        if (!$business || $business->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        // 2. Plan check
        $plan = strtolower($business->plan ?? 'starter');
        if (!in_array($plan, ['growth', 'pro'])) {
            return response()->json([
                'success' => false,
                'message' => 'This feature is available only on the Growth and Pro plans.',
            ], 403);
        }

        // 3. Generate AI reply
        $isRegeneration = $request->boolean('regenerate', false);
        $service = new \App\Services\ReviewGeneratorService();
        $replyText = $service->generateReply(
            $business->name,
            $business->type ?? 'Business',
            $review->generated_text,
            $review->stars ?? 4,
            $isRegeneration
        );

        if (empty($replyText)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate reply. Please try again.',
            ], 500);
        }

        // 4. Save reply
        $review->update([
            'reply_text' => $replyText,
            'reply_status' => 'generated',
            'replied_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'reply_text' => $replyText,
                'reply_status' => 'generated',
                'replied_at' => $review->replied_at,
            ],
        ]);
    }

    /**
     * Mark reply as posted to Google
     */
    public function postReply(Request $request, Review $review): JsonResponse
    {
        // 1. Get the business and check ownership
        $business = $review->business;
        if (!$business || $business->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized.'], 403);
        }

        // 2. Plan check
        $plan = strtolower($business->plan ?? 'starter');
        if (!in_array($plan, ['growth', 'pro'])) {
            return response()->json([
                'success' => false,
                'message' => 'This feature is available only on the Growth and Pro plans.',
            ], 403);
        }

        // 3. Update reply text if provided (user may have edited)
        $replyText = $request->input('reply_text', $review->reply_text);
        if (empty($replyText)) {
            return response()->json([
                'success' => false,
                'message' => 'Reply text is required.',
            ], 422);
        }

        $review->update([
            'reply_text' => $replyText,
            'reply_status' => 'posted',
            'replied_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reply posted successfully.',
            'data' => $review,
        ]);
    }
}
