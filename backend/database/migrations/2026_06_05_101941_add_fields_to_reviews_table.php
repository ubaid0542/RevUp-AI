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
        Schema::table('reviews', function (Blueprint $table) {
        $table->string('source', 50)->default('Local Templates')->after('language');
        $table->unsignedTinyInteger('stars')->default(4)->after('source');
        $table->json('photos')->nullable()->after('stars');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
        $table->dropColumn(['source', 'stars', 'photos']);
        });
    }
};
