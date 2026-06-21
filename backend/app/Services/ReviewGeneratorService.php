<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Review Generator Service
 *
 * Generates Hinglish or English reviews based on star ratings.
 * Uses built-in templates for local generation, or can be extended
 * to use OpenAI/Gemini API for more natural results.
 */
class ReviewGeneratorService
{
    protected array $ratingLabels = [
        'overall' => 'Overall Experience',
        'quality' => 'Product / Service Quality',
        'service' => 'Service & Staff',
        'value' => 'Value for Money',
        'ambience' => 'Ambience / Vibe',
        'recommend' => 'Likelihood to Recommend',
        'doctors' => 'Doctor Consultation',
        'staff' => 'Staff Behaviour',
        'cleanliness' => 'Cleanliness & Hygiene',
        'food' => 'Food Quality & Taste',
        'designs' => 'Variety & Designs',
        'rooms' => 'Room Quality',
        'hygiene' => 'Hygiene & Cleanliness',
        'teaching' => 'Teaching Quality',
        'facility' => 'Facilities & Infrastructure',
        'results' => 'Results & Performance',
    ];

    /**
     * Generate a review text based on business info and ratings.
     */
    public function generate(
        string $businessName,
        string $businessType,
        array $ratings,
        string $language = 'hinglish',
        array $options = []
    ): string {
        // 1st Priority: OpenRouter API
        $openRouterKey = env('OPENROUTER_API_KEY');
        if (!empty($openRouterKey)) {
            $apiResult = $this->generateWithOpenRouter($openRouterKey, $businessName, $businessType, $ratings, $language, $options);
            if ($apiResult) {
                return $apiResult;
            }
        }

        // OpenRouter failed or key missing — return empty (no local template fallback)
        Log::warning('OpenRouter review generation failed. No local template fallback. Business: ' . $businessName);
        return '';
    }

    /**
     * Generate a review using the Gemini API.
     */
    protected function generateWithGemini(string $apiKey, string $businessName, string $businessType, array $ratings, string $language, array $options = []): ?string
    {
        $prompt = $this->buildReviewPrompt($businessName, $businessType, $ratings, $language, $options);
        $temperature = !empty($options['regenerate']) ? 1.0 : 0.75;

        try {
            // Check if the Gemini facade class exists (installed via composer)
            if (class_exists('\Gemini\Laravel\Facades\Gemini')) {
                try {
                    $result = \Gemini\Laravel\Facades\Gemini::generativeModel(model: 'gemini-2.0-flash')
                        ->generateContent($prompt);
                    return trim($result->text());
                } catch (\Exception $facadeException) {
                    if ($this->isGeminiApiKeyError($facadeException->getMessage())) {
                        Log::error('Gemini API key is invalid or expired. Renew GEMINI_API_KEY.');
                        return null;
                    }

                    try {
                        Log::warning('Gemini 2.0 Facade failed, trying gemini-1.5-flash: ' . $facadeException->getMessage());
                        $result = \Gemini\Laravel\Facades\Gemini::generativeModel(model: 'gemini-1.5-flash')
                            ->generateContent($prompt);
                        return trim($result->text());
                    } catch (\Exception $facadeFallbackException) {
                        Log::warning('Gemini Facade failed with both models, trying direct HTTP request: ' . $facadeFallbackException->getMessage());
                    }
                }
            }

            // Fallback: Direct HTTP call to Gemini API
            // Try gemini-2.0-flash first
            try {
                $response = Http::timeout(10)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}", [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $prompt]
                                ]
                            ]
                        ],
                        'generationConfig' => [
                            'temperature' => $temperature,
                            'topP' => 0.95,
                        ]
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return trim($data['candidates'][0]['content']['parts'][0]['text'] ?? '');
                } else {
                    if ($this->isGeminiApiKeyError($response->body())) {
                        Log::error('Gemini API key is invalid or expired. Renew GEMINI_API_KEY.');
                        return null;
                    }

                    throw new \Exception('Gemini 2.0 Direct HTTP response failed: ' . $response->body());
                }
            } catch (\Exception $http2Exception) {
                Log::warning('Gemini 2.0 direct call failed, trying gemini-1.5-flash: ' . $http2Exception->getMessage());
                // Fallback to gemini-1.5-flash
                $response = Http::timeout(10)
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $prompt]
                                ]
                            ]
                        ],
                        'generationConfig' => [
                            'temperature' => $temperature,
                            'topP' => 0.95,
                        ]
                    ]);

                if ($response->successful()) {
                    $data = $response->json();
                    return trim($data['candidates'][0]['content']['parts'][0]['text'] ?? '');
                } else {
                    Log::error('Gemini 1.5 direct call failed too: ' . $response->body());
                }
            }
        } catch (\Exception $e) {
            Log::error('Gemini Exception: ' . $e->getMessage());
        }

        return null; // Fallback to local templates
    }

    protected function isGeminiApiKeyError(string $message): bool
    {
        return str_contains($message, 'API_KEY_INVALID')
            || str_contains($message, 'API key expired')
            || str_contains($message, 'API key not valid')
            || str_contains(strtolower($message), 'invalid api key');
    }

    /**
     * Generate a review using OpenRouter API (supports free models).
     * Tries multiple free models with fallback.
     */
    protected function generateWithOpenRouter(string $apiKey, string $businessName, string $businessType, array $ratings, string $language, array $options = []): ?string
    {
        $prompt = $this->buildReviewPrompt($businessName, $businessType, $ratings, $language, $options);
        $temperature = !empty($options['regenerate']) ? 1.0 : 0.75;

        // Paid models first (best quality), free models as fallback
        $models = [
            // — Paid (uses OpenRouter credit balance) —
            'openai/gpt-4o-mini',                // Very reliable, extremely smart, fast
            'google/gemini-2.5-flash',           // High quality, fast, native Hinglish support
            'anthropic/claude-3-haiku',          // Excellent natural conversational tone
            // — Free fallback —
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemini-2.0-flash-lite-preview-02-05:free',
        ];

        foreach ($models as $model) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'HTTP-Referer' => env('APP_URL', 'http://localhost:8000'),
                    'X-Title' => 'Review Generator',
                ])
                ->timeout(15)
                ->post('https://openrouter.ai/api/v1/chat/completions', [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => $temperature,
                ]);

                if ($response->successful()) {
                    $data = $response->json();
                    $text = trim($data['choices'][0]['message']['content'] ?? '');
                    if (!empty($text)) {
                        // Log token usage and estimated cost
                        $usage = $data['usage'] ?? [];
                        $promptTokens = $usage['prompt_tokens'] ?? '?';
                        $completionTokens = $usage['completion_tokens'] ?? '?';
                        $totalTokens = $usage['total_tokens'] ?? '?';
                        Log::info("OpenRouter review generated using model: $model | Tokens: prompt=$promptTokens, completion=$completionTokens, total=$totalTokens");
                        return $text;
                    }
                } else {
                    $body = $response->body();
                    // Rate limited on this model — try next
                    if ($response->status() === 429) {
                        Log::warning("OpenRouter model $model rate limited, trying next.");
                        continue;
                    }
                    Log::warning("OpenRouter model $model failed: $body");
                }
            } catch (\Exception $e) {
                Log::warning("OpenRouter model $model exception: " . $e->getMessage());
            }
        }

        Log::error('All OpenRouter models failed or rate limited.');
        return null;
    }

    /**
     * Generate a review using the OpenAI API.
     */
    protected function generateWithOpenAI(string $apiKey, string $businessName, string $businessType, array $ratings, string $language, array $options = []): ?string
    {
        $prompt = $this->buildReviewPrompt($businessName, $businessType, $ratings, $language, $options);

        try {
            $response = Http::withToken($apiKey)
                ->timeout(10)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-3.5-turbo',
                    'messages' => [
                        ['role' => 'system', 'content' => 'You are an expert review writer. Write authentic, believable consumer reviews based on the provided ratings.'],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'temperature' => !empty($options['regenerate']) ? 1.0 : 0.75,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return trim($data['choices'][0]['message']['content']);
            } else {
                Log::error('OpenAI API Error: ' . $response->body());
            }
        } catch (\Exception $e) {
            Log::error('OpenAI Exception: ' . $e->getMessage());
        }

        return null; // Fallback to local generation
    }

    protected function buildReviewPrompt(string $businessName, string $businessType, array $ratings, string $language, array $options = []): string
    {
        $overall = $ratings['overall'] ?? (int) round($this->getAverageRating($ratings));
        $subcategory = $options['businessSubcategory'] ?? '';
        $keywords = $options['customerKeywords'] ?? '';
        $city = $options['city'] ?? '';

        $ratingLines = [];
        foreach ($ratings as $key => $value) {
            if (!is_numeric($value)) continue;
            $label = $this->ratingLabels[$key] ?? $this->formatRatingKey($key);
            $level = (int)$value >= 4 ? 'very positive' : ((int)$value === 3 ? 'average' : 'negative');
            $ratingLines[] = "- {$label}: {$level}";
        }
        if (empty($ratingLines)) {
            $level = $overall >= 4 ? 'very positive' : ($overall === 3 ? 'average' : 'negative');
            $ratingLines[] = "- Overall Experience: {$level}";
        }

        // Rating-based tone
        $toneMap = [
            5 => 'Very positive, highly satisfied, naturally recommend the business.',
            4 => 'Positive with balanced appreciation and a small neutral observation if appropriate.',
            3 => 'Mixed experience with both good and average points.',
            2 => 'Mostly dissatisfied but polite and constructive.',
            1 => 'Clearly disappointed while remaining respectful.',
        ];
        $tone = $toneMap[$overall] ?? $toneMap[3];

        // Business context
        $bizContext = "Business Name: {$businessName}\nBusiness Category: {$businessType}";
        if (!empty($subcategory)) $bizContext .= "\nBusiness Subcategory: {$subcategory}";
        if (!empty($city)) $bizContext .= "\nCity: {$city}";

        // Name placement — randomize
        $namePlacements = [
            'Place the business name naturally in the MIDDLE of the review.',
            'Place the business name naturally near the END of the review.',
            'Place the business name at the START of the review in a natural way.',
            'Do NOT mention the business name at all — write without it if the review sounds more natural.',
            'Mention the business name only once, anywhere it fits naturally.',
        ];
        $namePlacement = $namePlacements[array_rand($namePlacements)];

        // Category-specific aspects to focus on
        $categoryAspects = [
            'Hospital/Clinic' => 'doctor behavior, treatment quality, wait time, cleanliness, staff attitude',
            'Restaurant/Cafe' => 'food taste, food quality, service speed, ambience, menu variety',
            'Jewellery Shop'  => 'design variety, gold/diamond quality, pricing, staff helpfulness, trust',
            'Hotel/Restro'    => 'room cleanliness, comfort, food, check-in experience, location',
            'Salon/Spa'       => 'staff skill, hygiene, haircut/service quality, ambience, pricing',
            'School/Coaching' => 'teaching quality, faculty, result, study environment, fees value',
            'Clothing Store'  => 'collection variety, fabric quality, pricing, fitting, staff behavior',
        ];
        $relevantAspects = $categoryAspects[$businessType] ?? 'service quality, staff behavior, overall experience, value for money';

        // ── Build the prompt ──
        $prompt  = "You are a humanizer and SEO expert. Your task is to rewrite a review so it sounds like a genuine customer sharing a real personal experience, while being naturally SEO-friendly.\n\n";

        $prompt .= "### Input Variables\n{$bizContext}\nSelected Rating: {$overall} out of 5 stars\n";
        if (!empty($keywords)) $prompt .= "Customer Keywords: {$keywords}\n";
        $prompt .= "\nDetailed aspect ratings:\n" . implode("\n", $ratingLines) . "\n\n";

        $prompt .= "### Core Rules\n";
        $prompt .= "- Rewrite the review as if a genuine customer is sharing a personal experience.\n";
        $prompt .= "- Keep the review between 25 to 50 words ONLY. Not a single word more.\n";
        $prompt .= "- Use 80% Hinglish (Roman Hindi — Hindi words written in English script) and 20% English.\n";
        $prompt .= "- Maintain a simple, conversational, and consistent writing style.\n";
        $prompt .= "- Vary sentence structure and vocabulary so every review feels fresh and unique.\n";
        $prompt .= "- Keep the original sentiment and selected star rating unchanged.\n";
        $prompt .= "- Return ONLY the final review text without quotes, headings, or explanations.\n\n";

        $prompt .= "### Natural SEO Integration\n";
        $prompt .= "- Naturally include relevant Business Name, Business Category, Business Subcategory, and City keywords where they fit organically in the sentence.\n";
        if (!empty($city)) {
            $prompt .= "- IMPORTANT (Local SEO): Include the city name \"{$city}\" naturally in the review. Combine it with Business Category or Subcategory for powerful local SEO phrases.\n";
            $prompt .= "  Examples of natural local SEO:\n";
            $prompt .= "    • '{$city} ka best {$businessType}' — city + category\n";
            if (!empty($subcategory) && $subcategory !== 'All') {
                $prompt .= "    • '{$city} me {$subcategory} ke liye best jagah' — city + subcategory\n";
            }
            $prompt .= "    • '{$businessName}, {$city} me kaafi accha experience raha' — name + city\n";
            $prompt .= "  The city should appear ONCE, naturally woven into a sentence. Do NOT repeat the city multiple times.\n";
        }
        $prompt .= "- NEVER force keyword stuffing. Keywords should feel like a natural part of the customer's language.\n";
        $prompt .= "- Example of natural SEO: 'XYZ Salon ka haircut kaafi accha tha' (name + subcategory woven in naturally).\n";
        $prompt .= "- Example of BAD stuffing: 'XYZ Salon best salon in city for haircut salon service' — NEVER do this.\n\n";

        $prompt .= "### Business Name Placement\n";
        $prompt .= "{$namePlacement}\n";
        $prompt .= "NEVER start every review with the business name. Vary the placement naturally.\n\n";

        $prompt .= "### Category-Specific Focus\n";
        $prompt .= "Mention ONLY aspects relevant to this business type: {$relevantAspects}.\n";
        $prompt .= "Do NOT invent products, services, staff names, or experiences that are not relevant to the business category.\n";
        $prompt .= "If the Business Name itself indicates a specialty (e.g., bakery, pizza, dental, mobile repair), use that context naturally.\n\n";

        $prompt .= "### Filler Words\n";
        $prompt .= "- Use natural conversational filler words ONLY when they fit naturally: kaafi, actually, overall, personally, waise, genuinely.\n";
        $prompt .= "- Maximum 1-2 filler words per review. Never overuse them.\n";
        if ($overall >= 4) {
            $prompt .= "- Since the rating is {$overall} stars (4 or above), naturally include the word \"best\" somewhere in the review as part of a human-like sentence. Do not force it at the beginning.\n";
        } else {
            $prompt .= "- Since the rating is {$overall} stars (3 or below), do NOT use the word \"best\" anywhere in the review.\n";
        }

        $prompt .= "\n### Rating-Based Tone\n";
        $prompt .= "Selected rating is {$overall} stars. Tone: {$tone}\n\n";

        if (!empty($keywords)) {
            $prompt .= "### Customer Keywords\n";
            $prompt .= "The customer mentioned these keywords: \"{$keywords}\". Weave them naturally into the review without forcing them.\n\n";
        }

        $prompt .= "### Strict Prohibitions\n";
        $prompt .= "- Do NOT include any numbers, ratings, or scores like \"4/5\", \"8/10\".\n";
        $prompt .= "- Do NOT mention star ratings in any form.\n";
        $prompt .= "- Do NOT include emojis or hashtags.\n";
        $prompt .= "- Do NOT include quotation marks around the review.\n";
        $prompt .= "- Do NOT add a title or heading.\n";
        $prompt .= "- Do NOT use excessive praise or robotic language.\n";
        $prompt .= "- Do NOT add facts, services, or experiences that are not provided in the input.\n";
        $prompt .= "- Do NOT use repetitive phrases across regenerations.\n";
        $prompt .= "- Output ONLY the review text, nothing else.\n";

        if (!empty($options['regenerate'])) {
            $perspectives = ['a young professional', 'a family person', 'a first-time visitor', 'a regular customer', 'a student', 'someone who visited with friends'];
            $tones = ['enthusiastic', 'calm and measured', 'casual and friendly', 'detailed and thoughtful', 'short and punchy', 'storytelling style'];
            $randomPerspective = $perspectives[array_rand($perspectives)];
            $randomTone = $tones[array_rand($tones)];

            $variationSeed = $options['variation_seed'] ?? (string) microtime(true);
            $prompt .= "\n### Regeneration\n";
            $prompt .= "This is a regenerate request. Write a COMPLETELY DIFFERENT review.\n";
            $prompt .= "Write from the perspective of {$randomPerspective} with a {$randomTone} tone.\n";
            $prompt .= "Use entirely different sentence structure, vocabulary, and focus on different aspects.\n";
            $prompt .= "Variation seed: {$variationSeed}.\n";

            if (!empty($options['previous_text'])) {
                $prompt .= "DO NOT repeat or rephrase any part of this previous review: \"{$options['previous_text']}\"\n";
            }
        }

        $prompt .= "\nGenerate a fresh, humanized, naturally SEO-friendly review now.";
        return $prompt;
    }

    protected function getAverageRating(array $ratings): float
    {
        $values = array_values(array_filter($ratings, fn ($value) => is_numeric($value)));

        if (empty($values)) {
            return 3;
        }

        return array_sum($values) / count($values);
    }

    protected function formatRatingKey(string $key): string
    {
        $label = preg_replace('/[_-]+/', ' ', $key);
        $label = preg_replace('/(?<!^)[A-Z]/', ' $0', $label);

        return ucwords($label);
    }

    /**
     * Generate Hinglish review text.
     */
    protected function generateHinglish(string $name, string $type, array $r): string
    {
        $overall = $r['overall'] ?? 3;

        // Helper: random name placement
        $rand = mt_rand(1, 100);
        if ($rand <= 20) $namePos = 'omit';
        elseif ($rand <= 50) $namePos = 'start';
        elseif ($rand <= 75) $namePos = 'mid';
        else $namePos = 'end';

        $typeLower = strtolower($type);
        $useBest = $overall >= 4;

        $templates = [];

        if ($overall >= 4) {
            $templates = [
                function () use ($name, $namePos, $typeLower) {
                    if ($namePos === 'start') return "{$name} mein kaafi accha experience mila, quality impressive thi aur staff ne bahut help ki. Sab kuch smooth raha aur paisa wasool laga. Honestly best jagah hai, recommend karunga sabko.";
                    if ($namePos === 'mid') return "Quality bahut acchi thi aur service smooth rahi. {$name} mein staff friendly tha aur overall sab kuch satisfying raha. Best experience mila genuinely, zaroor visit karo.";
                    if ($namePos === 'end') return "Service aur quality dono mein kaafi impressed hua. Staff helpful tha aur overall experience bahut accha raha. Sach mein best jagah hai {$name}, sabko recommend karta hoon.";
                    return "Actually bahut accha experience mila, quality impressive thi aur service prompt rahi. Staff ne bahut acche se treat kiya, overall best raha. Zaroor jaana chahiye.";
                },
                function () use ($name, $namePos, $typeLower) {
                    if ($namePos === 'end') return "Sab kuch bahut accha raha, quality top-notch thi aur staff ka behaviour genuinely pleasant tha. Paisa poora wasool hua aur experience best mila {$name} mein.";
                    if ($namePos === 'start') return "{$name} ka experience sach mein kaafi accha raha. Staff cooperative tha, quality impressive thi aur service bhi smooth mili. Best jagah hai honestly.";
                    return "Genuinely bahut accha experience mila, har cheez mein quality dikhi. Staff ne poori help ki aur sab smooth raha. Overall best experience mila sach mein.";
                },
            ];
        } elseif ($overall === 3) {
            $templates = [
                function () use ($name, $namePos) {
                    if ($namePos === 'start') return "{$name} mein experience normal raha, kuch accha tha kuch average. Quality theek thi aur service bhi passable lagi. Overall ek standard experience mila, try kar sakte ho.";
                    return "Quality average thi aur service mein bhi kuch khaas nahi laga. Staff normal tha, overall theek-thaak experience raha. Ek baar visit kar sakte ho agar nearby ho.";
                },
                function () use ($name, $namePos) {
                    return "Experience mixed raha, kuch cheezein acchi thi aur kuch average. Service normal thi aur quality bhi standard lagi. Overall theek tha, expectations se thoda kam mila.";
                },
            ];
        } else {
            $templates = [
                function () use ($name, $namePos) {
                    if ($namePos === 'start') return "{$name} se honestly thoda disappoint hua, quality expected se kam thi. Service bhi slow lagi aur staff attentive nahi tha. Improvement ki zaroorat hai, abhi recommend karna mushkil hai.";
                    return "Quality se bilkul satisfied nahi hua aur service mein bhi bahut kami thi. Staff ka attitude bhi improve hona chahiye. Waise disappointing raha overall, expected better tha.";
                },
                function () use ($name, $namePos) {
                    return "Honestly experience accha nahi raha, quality disappointing thi aur service slow lagi. Staff ko improve karna chahiye. Abhi recommend nahi karunga, umeed hai aage better hoga.";
                },
            ];
        }

        $template = $templates[array_rand($templates)];
        return $template();
    }

    /**
     * Generate English review text.
     */
    protected function generateEnglish(string $name, string $type, array $r): string
    {
        $overall = $r['overall'] ?? 3;

        // Random name placement
        $rand = mt_rand(1, 100);
        if ($rand <= 20) $namePos = 'omit';
        elseif ($rand <= 50) $namePos = 'start';
        elseif ($rand <= 75) $namePos = 'mid';
        else $namePos = 'end';

        $useBest = $overall >= 4;

        $templates = [];

        if ($overall >= 4) {
            $templates = [
                function () use ($name, $namePos) {
                    if ($namePos === 'start') return "{$name} gave me one of the best experiences. Quality was top-notch, staff was genuinely helpful, and everything felt well-organized. Highly recommend visiting if you get the chance.";
                    if ($namePos === 'mid') return "Had a really great experience overall. The quality at {$name} was impressive and the staff treated us well. Definitely one of the best places around, would recommend.";
                    if ($namePos === 'end') return "Quality was excellent and the service was smooth and professional. Staff was friendly and attentive throughout. One of the best experiences I have had at {$name}.";
                    return "Everything was handled professionally and the quality really impressed me. Staff was courteous and helpful. Definitely one of the best experiences, highly recommend to everyone.";
                },
            ];
        } elseif ($overall === 3) {
            $templates = [
                function () use ($name, $namePos) {
                    if ($namePos === 'start') return "{$name} was an okay experience overall. Some things were good, others were average. Service was acceptable but nothing stood out. Worth a try if you are nearby.";
                    return "Experience was decent but nothing exceptional. Quality was average and service was passable. Could improve in a few areas. Might visit again if things get better.";
                },
            ];
        } else {
            $templates = [
                function () use ($name, $namePos) {
                    if ($namePos === 'start') return "{$name} was quite disappointing honestly. Quality did not meet expectations and service felt rushed. Staff could be more attentive. Hope they improve going forward.";
                    return "Honestly the experience was below expectations. Quality was lacking and service was slow. Staff did not seem very engaged. Difficult to recommend at this point.";
                },
            ];
        }

        $template = $templates[array_rand($templates)];
        return $template();
    }
}
