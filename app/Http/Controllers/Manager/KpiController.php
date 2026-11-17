<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Models\Karyawan;
use App\Models\Kpi;
use App\Models\NilaiKpi;
use App\Models\TargetCapaian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KpiController extends Controller
{
    private const MEMENUHI = 'Memenuhi KPI';

    private const BELUM_MEMENUHI = 'Belum memenuhi KPI';

    /** Daftar staf beserta penilaian KPI-nya. */
    public function index(Request $request): JsonResponse
    {
        $staf = $this->karyawan($request)->staf()->with(['kpi', 'nilaiKpi'])->orderBy('nama_karyawan')->get();

        return $this->ok($staf, $staf->isEmpty() ? 'Belum ada staf di bawah tanggung jawab Anda' : null);
    }

    /** UC-01 Mengelola Data KPI Staf. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'staf_id' => ['required', 'integer', 'exists:karyawan,id'],
            'indikator' => ['required', 'array', 'min:1'],
            'indikator.*.indikator' => ['required', 'string', 'max:255', 'distinct'],
            'indikator.*.target_kpi' => ['required', 'numeric', 'gt:0'],
            'indikator.*.data_kinerja' => ['required', 'numeric', 'min:0'],
        ], ['required' => 'Indikator KPI belum lengkap', 'gt' => 'Target KPI harus lebih dari 0'] + self::PESAN);

        $staf = $this->stafSaya($request, $data['staf_id']);

        $nilai = DB::transaction(function () use ($staf, $data) {
            $detail = [];

            foreach ($data['indikator'] as $item) {
                $status = $item['data_kinerja'] >= $item['target_kpi'] ? self::MEMENUHI : self::BELUM_MEMENUHI;

                Kpi::updateOrCreate(
                    ['staf_id' => $staf->id, 'indikator' => $item['indikator']],
                    ['target_kpi' => $item['target_kpi'], 'data_kinerja' => $item['data_kinerja'], 'status_kpi' => $status],
                );
            }

            // Nilai akhir dihitung dari seluruh indikator staf, capaian dibatasi 100%.
            foreach ($staf->kpi()->get() as $kpi) {
                $detail[] = [
                    'indikator' => $kpi->indikator,
                    'target_kpi' => $kpi->target_kpi,
                    'data_kinerja' => $kpi->data_kinerja,
                    'capaian' => round(min($kpi->data_kinerja / $kpi->target_kpi, 1) * 100, 2),
                    'status_kpi' => $kpi->status_kpi,
                ];
            }

            return NilaiKpi::updateOrCreate(
                ['karyawan_id' => $staf->id],
                ['nilai_akhir' => round(collect($detail)->avg('capaian'), 2), 'detail_indikator' => $detail],
            );
        });

        return $this->ok([
            'staf' => $staf->only(['id', 'nama_karyawan', 'jabatan']),
            'status_kpi' => collect($nilai->detail_indikator)->every(fn ($d) => $d['status_kpi'] === self::MEMENUHI)
                ? self::MEMENUHI
                : self::BELUM_MEMENUHI,
            'nilai_kpi' => $nilai,
        ], 'Hasil penilaian KPI berhasil disimpan', 201);
    }

    /** UC-02 Memantau Target Capaian Karyawan. */
    public function targetCapaian(Request $request): JsonResponse
    {
        $manager = $this->karyawan($request);

        $staf = $manager->staf()
            ->with(['targetCapaian' => fn ($q) => $q->where('manager_id', $manager->id)])
            ->orderBy('nama_karyawan')
            ->get()
            ->each(fn ($item) => $item->setAttribute(
                'persentase_capaian',
                round((float) $item->targetCapaian->avg('persentase_capaian'), 2),
            ));

        $adaTarget = $staf->contains(fn ($item) => $item->targetCapaian->isNotEmpty());

        return $this->ok($staf, $adaTarget ? null : 'Belum ada target pelatihan yang ditetapkan');
    }

    /** Menetapkan atau memperbarui target capaian staf. */
    public function simpanTargetCapaian(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'integer', 'exists:target_capaian,id'],
            'karyawan_id' => ['required', 'integer', 'exists:karyawan,id'],
            'rincian_target' => ['required', 'string'],
            'persentase_capaian' => ['required', 'numeric', 'min:0', 'max:100'],
        ], self::PESAN);

        $manager = $this->karyawan($request);
        $staf = $this->stafSaya($request, $data['karyawan_id']);

        $target = isset($data['id'])
            ? TargetCapaian::where('manager_id', $manager->id)->where('karyawan_id', $staf->id)->findOrFail($data['id'])
            : new TargetCapaian(['manager_id' => $manager->id, 'karyawan_id' => $staf->id]);

        $target->fill([
            'rincian_target' => $data['rincian_target'],
            'persentase_capaian' => $data['persentase_capaian'],
        ])->save();

        return $this->ok($target, 'Target capaian berhasil disimpan', $target->wasRecentlyCreated ? 201 : 200);
    }

    /** Manager hanya boleh menilai staf di bawah tanggung jawabnya. */
    private function stafSaya(Request $request, int $stafId): Karyawan
    {
        $staf = $this->karyawan($request)->staf()->find($stafId);

        abort_if(! $staf, 403, 'Karyawan tersebut bukan staf di bawah tanggung jawab Anda');

        return $staf;
    }
}
