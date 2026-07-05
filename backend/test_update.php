<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$review = App\Models\Review::find(62);
if ($review) {
    $review->update(['is_posted' => true]);
    echo "Review 62 updated successfully! is_posted: " . $review->is_posted . "\n";
} else {
    echo "Review 62 not found!\n";
}
