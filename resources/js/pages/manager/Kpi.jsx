import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Plus, Save, Trash2 } from 'lucide-react';
import { Avatar, BackLink, Badge, Button, Card, Empty, Input, Muat, PageHeader, Progress, SearchInput, Segmented, Table, Umpan, useAksi } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { angka, tgl } from '../../lib/format';
import { FormModal } from '../hr/Pelatihan';
import { RincianKpi, RingkasanKpi } from '../hr/Lainnya';

/** Sel nama staf: avatar, nama, dan unit kerja. */
const Staf = ({ k }) => (
    <div className="flex items-center gap-3">
        <Avatar name={k.nama_karyawan} size={34} />
        <div>
            <p className="text-sm leading-[21px] font-semibold text-ink">{k.nama_karyawan}</p>
            <p className="text-[12.5px] leading-[19px] text-muted">{k.unit_kerja}</p>
        </div>
    </div>
);

const sudahDinilai = (k) => k.kpi.length > 0;
const memenuhi = (k) => k.kpi.every((i) => i.status_kpi === 'Memenuhi KPI');

// ---- UC-01 Data KPI staf ----------------------------------------------------

export function DataKpi() {
    const staf = useApi('/manager/kpi');
    const [cari, setCari] = useState('');
    const [saring, setSaring] = useState('semua');

    return (
        <>
            <PageHeader title="Data KPI Staf" description="Masukkan capaian indikator KPI staf untuk menilai kinerja peserta pelatihan di tim Anda." />
            <Muat sumber={staf} gagal="Gagal memuat data KPI">
                {(data, pesan) => {
                    const tampil = data
                        .filter((k) => k.nama_karyawan.toLowerCase().includes(cari.toLowerCase()))
                        .filter((k) => saring === 'semua' || (saring === 'sudah') === sudahDinilai(k));

                    return (
                        <section className="overflow-hidden rounded-xl border border-line bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <SearchInput className="w-full max-w-[320px]" placeholder="Cari staf berdasarkan nama" aria-label="Cari staf" value={cari} onChange={(e) => setCari(e.target.value)} />
                                <Segmented
                                    value={saring}
                                    onChange={setSaring}
                                    options={[
                                        ['semua', 'Semua'],
                                        ['belum', 'Belum Dinilai'],
                                        ['sudah', 'Sudah Dinilai'],
                                    ]}
                                />
                            </div>
                            <div className="border-t border-line">
                                <Table
                                    rows={tampil}
                                    empty={data.length ? 'Tidak ada staf pada filter ini' : (pesan ?? 'Belum ada staf di bawah tanggung jawab Anda')}
                                    columns={[
                                        { label: 'Nama staf', render: (k) => <Staf k={k} /> },
                                        { label: 'Jabatan', render: (k) => k.jabatan },
                                        { label: 'Indikator', render: (k) => k.kpi.length },
                                        {
                                            label: 'Status penilaian',
                                            render: (k) =>
                                                !sudahDinilai(k) ? <Badge tone="warn">Belum Dinilai</Badge> : <Badge tone={memenuhi(k) ? 'ok' : 'bad'}>{memenuhi(k) ? 'Memenuhi KPI' : 'Belum memenuhi KPI'}</Badge>,
                                        },
                                        { label: 'Hasil', render: (k) => (k.nilai_kpi ? <span className="font-semibold">{angka(k.nilai_kpi.nilai_akhir)}</span> : <span className="text-muted">—</span>) },
                                        {
                                            label: '',
                                            right: true,
                                            render: (k) => (
                                                <Button size="sm" variant={sudahDinilai(k) ? 'secondary' : 'primary'} to={`/manager/kpi/${k.id}`} iconRight={sudahDinilai(k) ? ChevronRight : undefined}>
                                                    {sudahDinilai(k) ? 'Lihat Detail' : 'Nilai KPI'}
                                                </Button>
                                            ),
                                        },
                                    ]}
                                />
                            </div>
                        </section>
                    );
                }}
            </Muat>
        </>
    );
}

function FormKpi({ staf, onSelesai }) {
    const navigate = useNavigate();
    const aksi = useAksi();
    const [baris, setBaris] = useState(
        staf.kpi.length
            ? staf.kpi.map((k) => ({ indikator: k.indikator, target_kpi: k.target_kpi, data_kinerja: k.data_kinerja }))
            : [{ indikator: '', target_kpi: '', data_kinerja: '' }],
    );

    const ubah = (indeks, kunci, nilai) => setBaris(baris.map((b, i) => (i === indeks ? { ...b, [kunci]: nilai } : b)));
    const capaian = (b) => (Number(b.target_kpi) > 0 && b.data_kinerja !== '' ? Math.min(Number(b.data_kinerja) / Number(b.target_kpi), 1) * 100 : null);
    const terisi = baris.map(capaian).filter((n) => n != null);
    const skor = terisi.length ? terisi.reduce((a, b) => a + b, 0) / terisi.length : null;

    const kirim = (event) => {
        event.preventDefault();
        aksi.jalankan(() => api('/manager/kpi', { method: 'POST', body: { staf_id: staf.id, indikator: baris } }), onSelesai);
    };

    return (
        <form onSubmit={kirim} className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
                <h2 className="text-[15px] leading-[23px] font-semibold text-ink">Indikator dan target KPI</h2>
                <p className="pt-0.5 text-[13px] leading-5 text-muted">Masukkan target dan capaian aktual untuk setiap indikator</p>
            </div>
            {(aksi.galat || aksi.sukses) && (
                <div className="px-5 pt-5">
                    <Umpan aksi={aksi} className="" />
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                    <thead>
                        <tr>
                            {[
                                ['Indikator', ''],
                                ['Target', 'text-right'],
                                ['Capaian indikator', ''],
                                ['Pencapaian', 'text-right'],
                                ['', ''],
                            ].map(([label, rata], i) => (
                                <th key={i} className={`border-b border-line bg-surface px-5 py-3 text-xs leading-[18px] font-semibold tracking-[0.3px] text-muted uppercase ${rata}`}>
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {baris.map((b, indeks) => {
                            const persen = capaian(b);

                            return (
                                <tr key={indeks} className="border-b border-line/70">
                                    <td className="px-5 py-3.5">
                                        <Input aria-label={`Indikator ${indeks + 1}`} placeholder="Nama indikator" value={b.indikator} onChange={(e) => ubah(indeks, 'indikator', e.target.value)} required />
                                    </td>
                                    <td className="w-36 px-5 py-3.5">
                                        <Input className="text-right" aria-label={`Target ${indeks + 1}`} type="number" min="0.01" step="any" value={b.target_kpi} onChange={(e) => ubah(indeks, 'target_kpi', e.target.value)} required />
                                    </td>
                                    <td className="w-40 px-5 py-3.5">
                                        <Input className="text-center" aria-label={`Capaian ${indeks + 1}`} type="number" min="0" step="any" value={b.data_kinerja} onChange={(e) => ubah(indeks, 'data_kinerja', e.target.value)} required />
                                    </td>
                                    <td className={`w-32 px-5 py-3.5 text-right text-sm font-semibold ${persen == null ? 'text-faint' : persen >= 100 ? 'text-ok' : 'text-bad'}`}>
                                        {persen == null ? '—' : `${angka(persen)}%`}
                                    </td>
                                    <td className="w-14 px-3 py-3.5">
                                        <Button variant="ghost" size="sm" icon={Trash2} aria-label="Hapus indikator" disabled={baris.length === 1} onClick={() => setBaris(baris.filter((_, i) => i !== indeks))} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-5 py-4">
                <div className="flex items-center gap-4">
                    <Button size="sm" icon={Plus} onClick={() => setBaris([...baris, { indikator: '', target_kpi: '', data_kinerja: '' }])}>
                        Tambah Indikator
                    </Button>
                    <span className="text-[13px] text-muted">Skor capaian rata-rata (maks. 100% per indikator) · ambang memenuhi KPI 100%</span>
                </div>
                <span className="text-xl font-semibold text-ink">{skor == null ? '—' : `${angka(skor)}%`}</span>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
                <Button onClick={() => navigate('/manager/kpi')}>Batal</Button>
                <Button type="submit" variant="primary" icon={Save} loading={aksi.sibuk}>
                    Simpan Penilaian
                </Button>
            </div>
        </form>
    );
}

export function PenilaianKpi() {
    const { id } = useParams();
    const { nama } = useAuth();
    const staf = useApi('/manager/kpi');

    return (
        <Muat sumber={staf} gagal="Gagal memuat data KPI">
            {(data) => {
                const k = data.find((item) => String(item.id) === id);

                if (!k) {
                    return (
                        <Card>
                            <Empty title="Staf tidak ditemukan" action={<Button to="/manager/kpi">Kembali ke Daftar</Button>} />
                        </Card>
                    );
                }

                return (
                    <div className="mx-auto max-w-[960px]">
                        <BackLink to="/manager/kpi">Kembali ke Daftar</BackLink>
                        <p className="text-[12.5px] leading-[19px] font-medium text-muted">Penilaian KPI</p>
                        <h1 className="pt-1 text-[26px] leading-[33px] font-semibold tracking-[-0.39px] text-ink">{k.nama_karyawan}</h1>
                        <p className="mb-6 pt-1.5 text-[14.5px] leading-6 text-muted">{k.jabatan}</p>

                        <RingkasanKpi karyawan={k} nilai={k.nilai_kpi} penilai={nama} />

                        {k.nilai_kpi && (
                            <Card className="mb-5" title="Rincian Indikator KPI" subtitle="Perbandingan standar atau target KPI dengan capaian aktual karyawan" flush>
                                <RincianKpi detail={k.nilai_kpi.detail_indikator} />
                            </Card>
                        )}

                        <FormKpi key={k.nilai_kpi?.updated_at ?? 'baru'} staf={k} onSelesai={staf.reload} />
                    </div>
                );
            }}
        </Muat>
    );
}

// ---- UC-02 Target capaian ---------------------------------------------------

const BatangProgres = ({ nilai }) => (
    <div className="flex min-w-[200px] items-center gap-3">
        <Progress value={nilai} />
        <span className="w-12 text-right font-semibold">{angka(nilai)}%</span>
    </div>
);

export function TargetCapaian() {
    const target = useApi('/manager/target-capaian');
    const [saring, setSaring] = useState('semua');
    const [cari, setCari] = useState('');
    const [buka, setBuka] = useState(null);
    const [form, setForm] = useState(null);

    return (
        <>
            <PageHeader title="Target Capaian" description="Pantau rekapitulasi progres dan penyelesaian target pelatihan tim Anda." />
            <Muat sumber={target} gagal="Gagal Memuat Data Capaian">
                {(data, pesan) => {
                    const tampil = data
                        .filter((k) => k.nama_karyawan.toLowerCase().includes(cari.toLowerCase()))
                        .filter((k) => saring === 'semua' || (saring === 'selesai') === (k.target_capaian.length > 0 && k.persentase_capaian >= 100));
                    const terbuka = data.find((k) => k.id === buka);

                    return (
                        <>
                            {pesan && data.length > 0 && <p className="mb-4 text-[13.5px] text-muted">{pesan}. Tetapkan target melalui tombol Lihat Detail.</p>}
                            <section className="overflow-hidden rounded-xl border border-line bg-white">
                                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                    <SearchInput className="w-full max-w-[380px]" placeholder="Cari staf berdasarkan nama…" aria-label="Cari staf" value={cari} onChange={(e) => setCari(e.target.value)} />
                                    <Segmented
                                        value={saring}
                                        onChange={setSaring}
                                        options={[
                                            ['semua', 'Semua'],
                                            ['belum', 'Belum Selesai'],
                                            ['selesai', 'Sudah Selesai'],
                                        ]}
                                    />
                                </div>
                                <div className="border-t border-line">
                                    <Table
                                        rows={tampil}
                                        empty={data.length ? 'Tidak ada staf pada filter ini' : 'Belum ada staf di bawah tanggung jawab Anda'}
                                        columns={[
                                            { label: 'Nama staf', render: (k) => <Staf k={k} /> },
                                            { label: 'Jabatan', render: (k) => k.jabatan },
                                            { label: 'Total target', render: (k) => <span className="font-semibold">{k.target_capaian.length}</span> },
                                            { label: 'Rata-rata progres', render: (k) => <BatangProgres nilai={k.persentase_capaian} /> },
                                            {
                                                label: 'Aksi',
                                                right: true,
                                                render: (k) => (
                                                    <Button size="sm" iconRight={ChevronRight} aria-expanded={buka === k.id} onClick={() => setBuka(buka === k.id ? null : k.id)}>
                                                        Lihat Detail
                                                    </Button>
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                            </section>

                            {terbuka && (
                                <Card
                                    className="mt-5"
                                    title={`Rincian target — ${terbuka.nama_karyawan}`}
                                    subtitle={`${terbuka.target_capaian.length} target ditetapkan`}
                                    flush
                                    action={
                                        <Button size="sm" variant="primary" icon={Plus} onClick={() => setForm({ karyawan_id: terbuka.id, persentase_capaian: 0 })}>
                                            Tambah Target
                                        </Button>
                                    }
                                >
                                    <Table
                                        rows={terbuka.target_capaian}
                                        empty="Belum ada target pelatihan yang ditetapkan"
                                        columns={[
                                            { label: 'Rincian target', render: (t) => <span className="font-medium">{t.rincian_target}</span> },
                                            { label: 'Capaian', render: (t) => <BatangProgres nilai={t.persentase_capaian} /> },
                                            { label: 'Diperbarui', render: (t) => tgl(t.updated_at) },
                                            {
                                                label: '',
                                                right: true,
                                                render: (t) => (
                                                    <Button size="sm" onClick={() => setForm(t)}>
                                                        Ubah
                                                    </Button>
                                                ),
                                            },
                                        ]}
                                    />
                                </Card>
                            )}
                        </>
                    );
                }}
            </Muat>

            {form && (
                <FormModal
                    judul={form.id ? 'Ubah Target Capaian' : 'Tambah Target Capaian'}
                    awal={form}
                    fields={[
                        { name: 'rincian_target', label: 'Rincian Target', type: 'textarea', required: true, full: true },
                        { name: 'persentase_capaian', label: 'Persentase Capaian (%)', type: 'number', min: 0, max: 100, required: true },
                    ]}
                    onKirim={(nilai) =>
                        api('/manager/target-capaian', {
                            method: 'POST',
                            body: { id: form.id, karyawan_id: form.karyawan_id, rincian_target: nilai.rincian_target, persentase_capaian: nilai.persentase_capaian },
                        })
                    }
                    onClose={(hasil) => {
                        setForm(null);
                        if (hasil) target.reload();
                    }}
                />
            )}
        </>
    );
}
