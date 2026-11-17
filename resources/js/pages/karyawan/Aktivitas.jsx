import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Avatar, Button, Card, Cell, Empty, Muat, PageHeader, Progress, SearchInput, Segmented, Select, Stat, StatusBadge, Table } from '../../components/ui';
import { useApi } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { angka, jam, tgl } from '../../lib/format';

// ---- UC-05 Target pelatihan -------------------------------------------------

const KOTAK_STATUS = [
    ['tercapai', 'Tercapai', 'text-ok'],
    ['berjalan', 'Berjalan', 'text-brand'],
    ['belum_dimulai', 'Belum Dimulai', 'text-muted'],
];

export function TargetPelatihan() {
    const { karyawan, nama } = useAuth();
    const target = useApi('/target-pelatihan');
    const [saring, setSaring] = useState('semua');

    return (
        <>
            <PageHeader
                title="Target Pelatihan"
                description="Target pelatihan yang ditetapkan untuk Anda berdasarkan standar perusahaan, jabatan, dan divisi, beserta progres pencapaiannya."
            />
            <Muat sumber={target} gagal="Gagal memuat target pelatihan">
                {(data, pesan) => {
                    const jumlah = (nilai) => data.filter((item) => item.status_progres === nilai).length;
                    const rata = data.length ? data.reduce((n, item) => n + item.persentase_progres, 0) / data.length : 0;
                    const tampil = data.filter((item) => saring === 'semua' || (saring === 'tercapai') === (item.status_progres === 'tercapai'));

                    return (
                        <div className="space-y-5">
                            {/* Identitas karyawan */}
                            <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-line bg-white px-5 py-4">
                                <div className="flex items-center gap-3.5">
                                    <Avatar name={nama} size={44} />
                                    <div>
                                        <p className="text-[15px] leading-[23px] font-semibold text-ink">{nama}</p>
                                        <p className="text-[13px] leading-5 text-muted">{karyawan?.jabatan}</p>
                                    </div>
                                </div>
                                <div className="grid flex-1 gap-x-10 gap-y-3 border-line pl-0 sm:grid-cols-3 lg:border-l lg:pl-6">
                                    {[
                                        ['Unit kerja', karyawan?.unit_kerja],
                                        ['Jabatan', karyawan?.jabatan],
                                        ['Jumlah target', `${data.length} target pelatihan`],
                                    ].map(([label, nilai]) => (
                                        <div key={label}>
                                            <p className="text-xs leading-[18px] text-muted">{label}</p>
                                            <p className="text-sm leading-[21px] font-medium text-ink">{nilai ?? '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {data.length === 0 ? (
                                <Card>
                                    <Empty title={pesan ?? 'Target pelatihan belum ditetapkan'}>HR/PSDM akan menetapkan target pelatihan Anda.</Empty>
                                </Card>
                            ) : (
                                <>
                                    <section className="rounded-xl border border-line bg-white">
                                        <h2 className="border-b border-line px-6 py-4 text-[15px] leading-[23px] font-semibold text-ink">Ringkasan Target Pelatihan</h2>
                                        <div className="grid items-center gap-x-12 gap-y-6 p-6 lg:grid-cols-[446px_1fr]">
                                            <div>
                                                <p className="text-[12.5px] leading-[19px] text-muted">Persentase progres keseluruhan</p>
                                                <p className="mt-2 flex items-baseline gap-3.5">
                                                    <span className="text-[34px] leading-10 font-semibold tracking-[-0.6px] text-ink">{angka(rata)}%</span>
                                                    <span className="text-sm text-muted">
                                                        {jumlah('tercapai')} dari {data.length} target tercapai
                                                    </span>
                                                </p>
                                                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-track">
                                                    <div className="h-full rounded-full bg-brand-bright" style={{ width: `${Math.min(100, rata)}%` }} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {KOTAK_STATUS.map(([kunci, label, warna]) => (
                                                    <div key={kunci} className="rounded-lg border border-line px-4 py-3">
                                                        <p className={`text-[22px] leading-[33px] font-semibold ${warna}`}>{jumlah(kunci)}</p>
                                                        <p className="text-[12.5px] leading-[21px] text-muted">{label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>

                                    <section className="rounded-xl border border-line bg-white">
                                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                                            <div>
                                                <h2 className="text-[15px] leading-[23px] font-semibold text-ink">Daftar Target Pelatihan</h2>
                                                <p className="pt-0.5 text-[13px] leading-5 text-muted">
                                                    {data.length} target · {jumlah('tercapai')} terpenuhi, {data.length - jumlah('tercapai')} belum terpenuhi
                                                </p>
                                            </div>
                                            <Segmented
                                                value={saring}
                                                onChange={setSaring}
                                                options={[
                                                    ['semua', 'Semua'],
                                                    ['belum', 'Belum terpenuhi'],
                                                    ['tercapai', 'Tercapai'],
                                                ]}
                                            />
                                        </div>
                                        {tampil.length === 0 ? (
                                            <Empty title="Tidak ada target pada filter ini" />
                                        ) : (
                                            <ul className="divide-y divide-line/70">
                                                {tampil.map((item) => (
                                                    <li key={item.id} className="grid items-center gap-x-10 gap-y-3 px-6 py-5 md:grid-cols-[1fr_minmax(240px,401px)_112px]">
                                                        <div>
                                                            <p className="text-[14.5px] leading-[22px] font-semibold text-ink">{item.target?.nama_target}</p>
                                                            <p className="pt-1 text-[12.5px] leading-[19px] text-muted">Diperbarui {tgl(item.updated_at)}</p>
                                                        </div>
                                                        <div>
                                                            <div className="flex justify-between text-[12.5px] leading-[19px]">
                                                                <span className="text-muted">Progres</span>
                                                                <span className="font-semibold text-ink">{angka(item.persentase_progres)}%</span>
                                                            </div>
                                                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
                                                                <div
                                                                    className={`h-full rounded-full ${item.status_progres === 'tercapai' ? 'bg-ok' : 'bg-brand-bright'}`}
                                                                    style={{ width: `${Math.min(100, item.persentase_progres)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="md:justify-self-end">
                                                            <StatusBadge value={item.status_progres} />
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </section>
                                    <p className="text-[12.5px] text-muted">Progres diperbarui oleh HR/PSDM berdasarkan pelatihan yang telah Anda selesaikan.</p>
                                </>
                            )}
                        </div>
                    );
                }}
            </Muat>
        </>
    );
}

// ---- UC-14 Jadwal pelatihan -------------------------------------------------

export const statusSesi = (sesi) => (sesi.sudah_presensi ? 'tercatat' : sesi.status_jadwal);

export function JadwalPelatihan() {
    const jadwal = useApi('/jadwal-pelatihan');

    return (
        <>
            <PageHeader title="Jadwal Pelatihan" description="Sesi pelatihan yang Anda ikuti beserta waktu, lokasi, dan status presensinya." />
            <Card flush>
                <Muat sumber={jadwal} gagal="Gagal memuat jadwal pelatihan">
                    {(data, pesan) => (
                        <Table
                            rows={data}
                            empty={pesan ?? 'Belum ada jadwal pelatihan'}
                            columns={[
                                { label: 'Pelatihan', render: (s) => <Cell title={s.pelatihan?.nama_pelatihan} sub={s.pelatihan?.jenis_pelatihan === 'wajib' ? 'Pelatihan wajib' : 'Pelatihan umum'} /> },
                                { label: 'Tanggal', render: (s) => tgl(s.tanggal_pelatihan) },
                                { label: 'Waktu', render: (s) => `${jam(s.waktu_mulai)}–${jam(s.waktu_selesai)}` },
                                { label: 'Metode / lokasi', render: (s) => s.lokasi },
                                { label: 'Status', render: (s) => <StatusBadge value={statusSesi(s)} /> },
                                {
                                    label: '',
                                    right: true,
                                    render: (s) =>
                                        s.status_jadwal === 'dibuka' && !s.sudah_presensi ? (
                                            <Button size="sm" variant="primary" to={`/presensi/${s.id}`}>
                                                Isi Presensi
                                            </Button>
                                        ) : (
                                            <Button size="sm" to={`/pelatihan/${s.pelatihan_id}`} iconRight={ChevronRight}>
                                                Detail
                                            </Button>
                                        ),
                                },
                            ]}
                        />
                    )}
                </Muat>
            </Card>
        </>
    );
}

// ---- UC-13 Riwayat pelatihan ------------------------------------------------

export function RiwayatPelatihan() {
    const kosong = { q: '', jenis: '', status: '' };
    const [saring, setSaring] = useState(kosong);
    const [diterapkan, setDiterapkan] = useState(kosong);
    const riwayat = useApi('/riwayat-pelatihan', diterapkan);
    const semua = useApi('/riwayat-pelatihan');

    const ringkas = [...(semua.data?.wajib ?? []), ...(semua.data?.mandiri ?? [])];
    const selesai = ringkas.filter((r) => r.status_pelatihan === 'selesai');

    return (
        <>
            <PageHeader title="Riwayat Pelatihan" description="Catatan pelatihan yang telah selesai maupun sedang berjalan sebagai bagian dari pengembangan Anda." />

            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Total pelatihan" value={ringkas.length} hint="Wajib dan mandiri" />
                <Stat label="Selesai" value={selesai.length} hint={`${selesai.filter((r) => r.jenis_pelatihan === 'mandiri').length} di antaranya mandiri`} />
                <Stat label="Sedang berjalan" value={ringkas.filter((r) => r.status_pelatihan === 'on_progress').length} hint="Belum menyelesaikan post-test" />
                <Stat label="Lulus" value={ringkas.filter((r) => r.status_kelulusan === 'lulus').length} hint="Dari pelatihan yang selesai" />
            </div>

            <section className="overflow-hidden rounded-xl border border-line bg-white">
                <form
                    className="flex flex-wrap gap-3 px-5 py-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setDiterapkan(saring);
                    }}
                >
                    <SearchInput className="min-w-[220px] flex-1" placeholder="Cari nama pelatihan" aria-label="Cari nama pelatihan" value={saring.q} onChange={(e) => setSaring({ ...saring, q: e.target.value })} />
                    <Select className="w-[180px]" aria-label="Filter jenis" value={saring.jenis} onChange={(e) => setSaring({ ...saring, jenis: e.target.value })}>
                        <option value="">Semua jenis</option>
                        <option value="wajib">Wajib</option>
                        <option value="mandiri">Mandiri</option>
                    </Select>
                    <Select className="w-[180px]" aria-label="Filter status" value={saring.status} onChange={(e) => setSaring({ ...saring, status: e.target.value })}>
                        <option value="">Semua status</option>
                        <option value="selesai">Selesai</option>
                        <option value="on_progress">Berjalan</option>
                        <option value="belum_dikerjakan">Belum dikerjakan</option>
                    </Select>
                    <Button type="submit" variant="primary" icon={Search}>
                        Cari
                    </Button>
                </form>

                <Muat sumber={riwayat} gagal="Gagal memuat riwayat pelatihan">
                    {(data, pesan) => {
                        const baris = [...data.wajib, ...data.mandiri].sort((a, b) => String(b.tanggal_mulai).localeCompare(String(a.tanggal_mulai)));

                        if (!baris.length) {
                            return (
                                <div className="border-t border-line">
                                    <Empty title={pesan ?? 'Riwayat pelatihan tidak ditemukan'}>Ubah kata kunci atau filter pencarian.</Empty>
                                </div>
                            );
                        }

                        return (
                            <div className="border-t border-line">
                                <Table
                                    rows={baris}
                                    columns={[
                                        {
                                            label: 'Nama pelatihan',
                                            render: (r) => <Cell title={r.nama_pelatihan} sub={`${tgl(r.tanggal_mulai)} – ${r.tanggal_selesai ? tgl(r.tanggal_selesai) : 'sekarang'}`} />,
                                        },
                                        { label: 'Jenis', render: (r) => (r.jenis_pelatihan === 'wajib' ? 'Wajib' : 'Mandiri') },
                                        { label: 'Status', render: (r) => <StatusBadge value={r.status_kelulusan === 'tidak_lulus' ? 'tidak_lulus' : r.status_pelatihan} /> },
                                        { label: 'Kelulusan', render: (r) => (r.status_kelulusan ? <StatusBadge value={r.status_kelulusan} dot={false} /> : <span className="text-muted">—</span>) },
                                        {
                                            label: '',
                                            right: true,
                                            render: (r) =>
                                                r.pelatihan_id && (
                                                    <Button size="sm" to={`/pelatihan/${r.pelatihan_id}`} iconRight={ChevronRight}>
                                                        Detail
                                                    </Button>
                                                ),
                                        },
                                    ]}
                                />
                                <p className="border-t border-line px-5 py-3.5 text-[13px] text-muted">Menampilkan {baris.length} riwayat</p>
                            </div>
                        );
                    }}
                </Muat>
            </section>
        </>
    );
}
