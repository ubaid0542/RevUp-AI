<?php

namespace App\Services;

/**
 * Review Generator Service
 *
 * Generates Hinglish or English reviews based on star ratings.
 * Uses built-in templates for local generation, or can be extended
 * to use OpenAI/Gemini API for more natural results.
 */
class ReviewGeneratorService
{
    /**
     * Generate a review text based on business info and ratings.
     */
    public function generate(
        string $businessName,
        string $businessType,
        array $ratings,
        string $language = 'hinglish'
    ): string {
        if ($language === 'english') {
            return $this->generateEnglish($businessName, $businessType, $ratings);
        }

        return $this->generateHinglish($businessName, $businessType, $ratings);
    }

    /**
     * Generate Hinglish review text.
     */
    protected function generateHinglish(string $name, string $type, array $r): string
    {
        $overall   = $r['overall'] ?? 3;
        $quality   = $r['quality'] ?? 3;
        $service   = $r['service'] ?? 3;
        $value     = $r['value'] ?? 3;
        $ambience  = $r['ambience'] ?? 3;
        $recommend = $r['recommend'] ?? 3;
        $typeLower = strtolower($type);

        $templates = [
            function () use ($name, $typeLower, $overall, $quality, $service, $value, $recommend) {
                $intro = $overall >= 4
                    ? "{$name} ka experience ekdum mast raha!"
                    : ($overall === 3
                        ? "{$name} ka experience theek-thaak raha."
                        : "{$name} ka experience bilkul achha nahi raha.");

                $qStr = $quality >= 4
                    ? "{$typeLower} ki quality zabardast thi, sach mein maja aa gaya."
                    : ($quality === 3
                        ? "Quality average thi, kuch khaas nahi."
                        : "Quality se bilkul satisfied nahi tha/thi.");

                $sStr = $service >= 4
                    ? "Staff bahut friendly aur helpful tha."
                    : ($service === 3
                        ? "Service theek thi, kuch improvement ho sakti hai."
                        : "Service thodi slow aur careless lagi.");

                $vStr = $value >= 4
                    ? "Paisa wasool tha!"
                    : ($value === 3
                        ? "Pricing fair hai."
                        : "Thoda mehnga laga given the experience.");

                $rStr = $recommend >= 4
                    ? "Definitely recommend karunga/karungi sabko!"
                    : ($recommend === 3
                        ? "Ek baar try kar sakte ho agar nearby ho."
                        : "Abhi recommend karna mushkil hai.");

                return "{$intro} {$qStr} {$sStr} {$vStr} {$rStr}";
            },

            function () use ($name, $typeLower, $overall, $quality, $service, $value, $ambience, $recommend) {
                $start = $overall >= 5
                    ? "Yaar, {$name} ne toh dil jeet liya!"
                    : ($overall >= 4
                        ? "{$name} visit karna ek achha decision tha!"
                        : ($overall === 3
                            ? "{$name} — ek dum average experience mila."
                            : "{$name} se kuch zyada umeed thi, par disappointing raha."));

                $atm = $ambience >= 4
                    ? "Jagah ka mahaul ekdum shandaar tha, bahut cozy feel hua."
                    : ($ambience === 3
                        ? "Ambience theek tha, na zyada achha na bura."
                        : "Jagah ka mahaul thoda improve hona chahiye.");

                $end = $recommend >= 4
                    ? "Mere saare doston ko iske baare mein bata diya hai — must visit hai!"
                    : ($recommend === 3
                        ? "Ek baar zaroor try karo."
                        : "Abhi tak wapas jaane ka mann nahi hai.");

                $qStr = $quality >= 4
                    ? "Quality ekdum top-class thi."
                    : ($quality >= 3
                        ? "Quality acceptable thi."
                        : "Quality kafi disappointing thi.");

                $sStr = $service >= 4
                    ? "Service ne bhi impress kiya."
                    : "Service mein thoda dhyan dena chahiye.";

                $vStr = $value >= 4
                    ? "Value for money bilkul sahi."
                    : "Pricing pe thoda sochna padega.";

                return "{$start} {$qStr} {$sStr} {$atm} {$vStr} {$end}";
            },

            function () use ($name, $typeLower, $overall, $quality, $service, $value, $ambience, $recommend) {
                $feel = $overall >= 4
                    ? "{$name} se wapas aaya/aayi toh mann khush ho gaya!"
                    : ($overall === 3
                        ? "{$name} se mix feelings hain — na full satisfied, na dissatisfied."
                        : "{$name} se baar baar kaafi disappointed feel hua.");

                $highlights = implode(', ', [
                    $quality >= 4 ? "quality ekdum lajawab thi" : ($quality === 3 ? "quality average thi" : "quality mein kami thi"),
                    $service >= 4 ? "service ne dil khush kar diya" : ($service === 3 ? "service normal thi" : "service improve honi chahiye"),
                    $value >= 4 ? "paisa wasool experience mila" : ($value === 3 ? "pricing thodi fair hai" : "pricing ke hisaab se kuch khaas nahi mila"),
                ]);

                $aStr = $ambience >= 4
                    ? "Jagah ka vibe ekdum alag hi tha, mast laga."
                    : ($ambience === 3
                        ? "Jagah theek-thaak thi."
                        : "Setting mein thoda kaam karna chahiye.");

                $rStr = $recommend >= 4
                    ? "Sabko bolna chahta/chahti hoon — ek baar zaroor jao!"
                    : ($recommend === 3
                        ? "Kabhi paas ho toh try karo."
                        : "Filhaal recommend karna tough hai.");

                return "{$feel} — {$highlights}. {$aStr} {$rStr}";
            },

            function () use ($name, $typeLower, $overall, $quality, $service, $value, $ambience, $recommend) {
                $open = $overall >= 4
                    ? "Sach bolun toh {$name} ne expectations se zyada impress kiya!"
                    : ($overall === 3
                        ? "{$name} — ek reliable jagah hai, kuch wow nahi mila par disappointing bhi nahi tha."
                        : "{$name} ka experience expect se kaafi disappointing raha, honestly.");

                $body = ($quality >= 4
                    ? "Jo mila uski quality ekdum first class thi."
                    : "Quality pe thoda aur dhyan dena chahiye.")
                    . " " . ($service >= 4
                        ? "Staff ne bahut acche se treat kiya, feel good raha."
                        : "Staff friendly ho sakta hai, thodi practice chahiye.")
                    . " " . ($value >= 4
                        ? "Paison ki complete value mili, no regrets."
                        : "Price ke hisaab se expectation thodi zyada thi.");

                $aStr = $ambience >= 4
                    ? "Aur jagah ka atmosphere — ekdum premium feel."
                    : ($ambience === 3
                        ? "Atmosphere casual aur decent tha."
                        : "Atmosphere pe thoda kaam hona chahiye.");

                $close = $recommend >= 4
                    ? "Family aur friends sabko yahan laane ka plan hai! ❤️"
                    : ($recommend === 3
                        ? "Ek chance dene layak jagah hai."
                        : "Hope hai ki agli baar better experience hoga.");

                return "{$open} {$body} {$aStr} {$close}";
            },
        ];

        $template = $templates[array_rand($templates)];
        return $template();
    }

    /**
     * Generate English review text.
     */
    protected function generateEnglish(string $name, string $type, array $r): string
    {
        $overall   = $r['overall'] ?? 3;
        $quality   = $r['quality'] ?? 3;
        $service   = $r['service'] ?? 3;
        $value     = $r['value'] ?? 3;
        $ambience  = $r['ambience'] ?? 3;
        $recommend = $r['recommend'] ?? 3;

        $templates = [
            function () use ($name, $type, $overall, $quality, $service, $value, $ambience, $recommend) {
                $intro = $overall >= 4
                    ? "Had an amazing experience at {$name}!"
                    : ($overall === 3
                        ? "My experience at {$name} was decent overall."
                        : "Unfortunately, {$name} didn't meet my expectations.");

                $qStr = $quality >= 4
                    ? "The quality of the {$type} was outstanding — truly impressed."
                    : ($quality === 3
                        ? "Quality was average, nothing exceptional."
                        : "Quality was disappointing and needs improvement.");

                $sStr = $service >= 4
                    ? "The staff was incredibly friendly and attentive."
                    : ($service === 3
                        ? "Service was acceptable but could be improved."
                        : "Service was slow and felt careless.");

                $vStr = $value >= 4
                    ? "Excellent value for money!"
                    : ($value === 3
                        ? "Pricing is fair for what you get."
                        : "A bit pricey for the experience offered.");

                $aStr = $ambience >= 4
                    ? "The ambience was fantastic — very welcoming."
                    : ($ambience === 3
                        ? "The atmosphere was okay."
                        : "The environment needs some work.");

                $rStr = $recommend >= 4
                    ? "Highly recommend to everyone!"
                    : ($recommend === 3
                        ? "Worth a try if you're in the area."
                        : "Hard to recommend at this point.");

                return "{$intro} {$qStr} {$sStr} {$vStr} {$aStr} {$rStr}";
            },

            function () use ($name, $type, $overall, $quality, $service, $value, $ambience, $recommend) {
                $intro = $overall >= 4
                    ? "Absolutely loved visiting {$name}! What a gem."
                    : ($overall === 3
                        ? "{$name} was an okay experience — nothing extraordinary."
                        : "Quite disappointed with my visit to {$name}.");

                $body = ($quality >= 4 ? "Top-notch quality." : ($quality >= 3 ? "Quality was passable." : "Quality was lacking."))
                    . " " . ($service >= 4 ? "Service was exemplary." : "Service could use improvement.")
                    . " " . ($value >= 4 ? "Great bang for your buck." : ($value >= 3 ? "Fair pricing." : "Overpriced for what's offered."))
                    . " " . ($ambience >= 4 ? "The vibe was perfect." : "Atmosphere was nothing special.");

                $close = $recommend >= 4
                    ? "Already told all my friends about it — a must-visit!"
                    : ($recommend === 3
                        ? "Give it a shot if you're nearby."
                        : "Hope they improve for next time.");

                return "{$intro} {$body} {$close}";
            },
        ];

        $template = $templates[array_rand($templates)];
        return $template();
    }
}
