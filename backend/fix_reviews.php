<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$count = App\Models\Review::whereNull('is_posted')->orWhere('is_posted', false)->update(['is_posted' => true]);
echo "Updated $count reviews to is_posted = true\n";
