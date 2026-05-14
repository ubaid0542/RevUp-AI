<?php

namespace App\Http\Controllers;

use App\Models\Business;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BusinessController extends Controller
{
    /**
     * Create a new business profile.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:60',
            'type' => 'nullable|string|max:50',
            'google_place_id' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $business = Business::create([
            'name' => $request->name,
            'type' => $request->type ?? 'Business',
            'google_place_id' => $request->google_place_id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $business,
        ], 201);
    }

    /**
     * Get a business profile by ID.
     */
    public function show(Business $business): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $business->load('reviews'),
        ]);
    }

    /**
     * Update a business profile.
     */
    public function update(Request $request, Business $business): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:60',
            'type' => 'nullable|string|max:50',
            'google_place_id' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $business->update($request->only(['name', 'type', 'google_place_id']));

        return response()->json([
            'success' => true,
            'data' => $business,
        ]);
    }

    /**
     * Upload a logo for a business.
     */
    public function uploadLogo(Request $request, Business $business): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Delete old logo if exists
        if ($business->logo_path && Storage::disk('public')->exists($business->logo_path)) {
            Storage::disk('public')->delete($business->logo_path);
        }

        $path = $request->file('logo')->store('logos', 'public');
        $business->update(['logo_path' => $path]);

        return response()->json([
            'success' => true,
            'data' => [
                'logo_url' => Storage::url($path),
                'business' => $business,
            ],
        ]);
    }
}
