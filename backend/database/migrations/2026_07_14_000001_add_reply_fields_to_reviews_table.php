<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->text('reply_text')->nullable()->after('is_posted');
            $table->string('reply_status', 20)->default('none')->after('reply_text');
            $table->timestamp('replied_at')->nullable()->after('reply_status');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['reply_text', 'reply_status', 'replied_at']);
        });
    }
};
