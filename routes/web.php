<?php

use Illuminate\Support\Facades\Route;

// Aplikasi satu halaman (React): seluruh rute selain API dilayani oleh view yang sama.
Route::view('/{any?}', 'app')->where('any', '^(?!api|up|storage|build).*$');
