<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_halaman_aplikasi_dilayani_untuk_rute_frontend(): void
    {
        $this->withoutVite();

        $this->get('/')->assertOk();
        $this->get('/pelatihan/1')->assertOk();
    }
}
