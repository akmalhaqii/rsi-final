import { ArrowRight, CalendarDays } from 'lucide-react';
import { Alert, Avatar, Button, Card, Empty, Muat, PageHeader, Progress, Rincian, Stat, StatusBadge } from '../components/ui';
import { useApi } from '../lib/api';
import { PERAN, useAuth } from '../lib/auth';
import { angka, jam, tgl } from '../lib/format';

// ---- Dashboard -------------------------------------------------------------

function DaftarSesi({ sesi, kosong }) {
    if (!sesi?.length) return <Empty title={kosong} />;

    return (
        <ul className="divide-y divide-line/70">
            {sesi.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <CalendarDays className="size-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.pelatihan?.nama_pelatihan}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                            {tgl(item.tanggal_pelatihan)} · {jam(item.waktu_mulai)}–{jam(item.waktu_selesai)} · {item.lokasi}
                        </p>
                    </div>
                    <StatusBadge value={item.status_jadwal} />
                </li>
            ))}
        </ul>
    );
}

function DashboardKaryawan({ data }) {
    const target = data.target_pelatihan ?? [];
    const rata = target.length ? target.reduce((jumlah, item) => jumlah + item.persentase_progres, 0) / target.length : 0;

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Pelatihan diikuti" value={data.pelatihan_diikuti} hint="Sedang berjalan" />
                <Stat label="Tugas belum dikerjakan" value={data.tugas_belum_dikerjakan} tone={data.tugas_belum_dikerjakan ? 'brand' : undefined} hint="Tes dan skill assessment" />
                <Stat label="Notifikasi baru" value={data.notifikasi_belum_dibaca} hint="Belum dibaca" />
                <Stat label="Progres target" value={`${angka(rata)}%`} hint={`${target.length} target pelatihan`} />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <Card title="Jadwal terdekat" subtitle="Sesi pelatihan yang akan Anda ikuti" flush action={<Button size="sm" to="/jadwal" iconRight={ArrowRight}>Semua jadwal</Button>}>
                    <DaftarSesi sesi={data.jadwal_terdekat} kosong="Belum ada jadwal pelatihan" />
                </Card>

                <Card title="Target pelatihan" subtitle="Progres pencapaian target Anda" action={<Button size="sm" to="/target">Rincian</Button>}>
                    {target.length === 0 ? (
                        <p className="text-[13.5px] text-muted">Target pelatihan belum ditetapkan.</p>
                    ) : (
                        <ul className="space-y-4">
                            {target.map((item) => (
                                <li key={item.id}>
                                    <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                                        <span className="text-ink">{item.target?.nama_target}</span>
                                        <span className="font-semibold text-ink">{angka(item.persentase_progres)}%</span>
                                    </div>
                                    <Progress value={item.persentase_progres} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}

export function Dashboard() {
    const { nama, hak } = useAuth();
    const dashboard = useApi('/dashboard');

    return (
        <>
            <PageHeader
                title={`Halo, ${nama.split(' ')[0]}`}
                description={
                    {
                        karyawan: 'Ringkasan aktivitas pengembangan kompetensi Anda.',
                        hr: 'Ringkasan pengelolaan pelatihan dan pengembangan kompetensi karyawan.',
                        manager: 'Ringkasan kinerja dan capaian target tim Anda.',
                    }[hak]
                }
            />
            <Muat sumber={dashboard}>
                {(data) => (
                    <div className="space-y-8">
                        {data.pengelolaan && (
                            <section>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <Stat label="Karyawan aktif" value={data.pengelolaan.karyawan_aktif} />
                                    <Stat label="Pelatihan aktif" value={data.pengelolaan.pelatihan_aktif} />
                                    <Stat label="Peserta terdaftar" value={data.pengelolaan.peserta_terdaftar} />
                                    <Stat
                                        label="Pengajuan menunggu"
                                        value={data.pengelolaan.pengajuan_menunggu}
                                        tone={data.pengelolaan.pengajuan_menunggu ? 'brand' : undefined}
                                        hint="Perlu persetujuan Anda"
                                    />
                                </div>
                                <Card className="mt-5" title="Sesi mendatang" subtitle="Lima sesi pelatihan terdekat" flush action={<Button size="sm" to="/hr/pelatihan">Kelola pelatihan</Button>}>
                                    <DaftarSesi sesi={data.pengelolaan.sesi_mendatang} kosong="Belum ada sesi pelatihan terjadwal" />
                                </Card>
                            </section>
                        )}

                        {data.tim && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Stat label="Jumlah staf" value={data.tim.jumlah_staf} hint="Di bawah tanggung jawab Anda" />
                                <Stat label="Sudah dinilai KPI" value={`${data.tim.sudah_dinilai_kpi} / ${data.tim.jumlah_staf}`} />
                                <Stat label="Rata-rata capaian target" value={`${angka(data.tim.rata_rata_capaian_target)}%`} />
                            </div>
                        )}

                        {data.pengembangan && (
                            <section>
                                {data.pengelolaan && <h2 className="mb-4 text-[15px] font-semibold text-ink">Pengembangan Anda</h2>}
                                <DashboardKaryawan data={data.pengembangan} />
                            </section>
                        )}

                        {!data.karyawan && <Alert tone="warn" title="Akun belum terhubung dengan data karyawan">Hubungi HR/PSDM untuk melengkapi data Anda.</Alert>}
                    </div>
                )}
            </Muat>
        </>
    );
}

// ---- Profil ----------------------------------------------------------------

export function Profil() {
    const { akun, karyawan, nama, hak } = useAuth();

    return (
        <>
            <PageHeader title="Profil" description="Data akun dan identitas karyawan Anda. Perubahan data dilakukan oleh HR/PSDM." />
            <Card>
                <div className="mb-6 flex items-center gap-4">
                    <Avatar name={nama} size={56} />
                    <div>
                        <p className="text-lg font-semibold text-ink">{nama}</p>
                        <p className="text-[13.5px] text-muted">{karyawan?.jabatan ?? PERAN[hak]}</p>
                    </div>
                </div>
                <Rincian
                    items={[
                        ['Username', akun.username],
                        ['Hak akses', PERAN[hak]],
                        ['Unit kerja', karyawan?.unit_kerja],
                        ['Status', <StatusBadge key="s" value={karyawan?.status_karyawan ?? akun.status_akun} />],
                    ]}
                />
            </Card>
        </>
    );
}
