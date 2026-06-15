<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
        $table->unsignedBigInteger('user_id')->nullable()->after('id');
        $table->string('gmb_link', 500)->nullable()->after('google_place_id');
        $table->string('emoji', 10)->default('⭐')->after('gmb_link');
        $table->string('subcategory', 100)->nullable()->after('emoji');
        $table->string('plan', 20)->default('Free')->after('subcategory');
        $table->json('extras')->nullable()->after('plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
        $table->dropColumn(['user_id', 'gmb_link', 'emoji', 'subcategory', 'plan', 'extras']);
        });
    }
};
