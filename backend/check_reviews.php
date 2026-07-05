<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$reviews = App\Models\Review::latest()->take(10)->get(['id','business_id','is_posted','generated_text','created_at']);
foreach($reviews as $r) {
    echo "ID: {$r->id} | is_posted: {$r->is_posted} | text: " . substr($r->generated_text, 0, 30) . "\n";
}
