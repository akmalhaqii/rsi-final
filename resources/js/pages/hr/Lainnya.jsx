import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, ChevronRight, Plus, Search } from 'lucide-react';
import { Alert, Avatar, Badge, Button, Card, Cell, Empty, Field, Input, Modal, Muat, PageHeader, Progress, SearchInput, Segmented, Select, Stat, StatusBadge, Table, Textarea, Umpan, useAksi } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { PERAN } from '../../lib/auth';
import { angka, tgl } from '../../lib/format';
import { FormModal, Konfirmasi } from './Pelatihan';

const Orang = ({ k }) => (
    <div className="flex items-center gap-3">
        <Avatar name={k?.nama_karyawan} size={34} />
        <Cell title={k?.nama_karyawan ?? '—'} sub={k?.jabatan} />
    </div>
);

// ---- Pengajuan pelatihan (persetujuan HR/PSDM) ------------------------------

export function Pengajuan() {
    const [status, setStatus] = useState('diajukan');
    const pengajuan = useApi('/hr/pengajuan', { status });
    const setuju = useAksi();
    const [tolak, setTolak] = useState(null);
    const [catatan, setCatatan] = useState('');
    const aksiTolak = useAksi();

    return (
        <>
            <PageHeader title="Pengajuan Pelatihan" description="Tinjau pengajuan pendaftaran pelatihan umum dari karyawan, lalu setujui atau tolak." />
            <Umpan aksi={setuju} />

            <Card flush>
                <div className="border-b border-line px-5 py-3">
                    <Segmented
                        value={status}
                        onChange={setStatus}
                        options={[
                            ['diajukan', 'Menunggu'],
                            ['terdaftar', 'Disetujui'],
                            ['ditolak', 'Ditolak'],
                            ['semua', 'Semua'],
                        ]}
                    />
                </div>
                <Muat sumber={pengajuan} gagal="Gagal memuat pengajuan">
                    {(data, pesan) => (
                        <Table
                            rows={data}
                            empty={pesan ?? 'Tidak ada pengajuan pelatihan'}
                            columns={[
                                { label: 'Karyawan', render: (p) => <Orang k={p.karyawan} /> },
                                { label: 'Pelatihan', render: (p) => <Cell title={p.pelatihan?.nama_pelatihan} sub={`Mulai ${tgl(p.pelatihan?.jadwal)}`} /> },
                                { label: 'Alasan', render: (p) => <span className="block max-w-xs text-body">{p.alasan_pengajuan}</span> },
                                { label: 'Diajukan', render: (p) => tgl(p.tanggal_daftar) },
                                { label: 'Status', render: (p) => <StatusBadge value={p.status_peserta} /> },
                                {
                                    label: 'Aksi',
                                    right: true,
                                    render: (p) =>
                                        p.status_peserta === 'diajukan' ? (
                                            <div className="flex justify-end gap-1.5">
                                                <Button size="sm" variant="danger" onClick={() => { setCatatan(''); setTolak(p); }}>
                                                    Tolak
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    loading={setuju.sibuk}
                                                    onClick={() => setuju.jalankan(() => api(`/hr/pengajuan/${p.id}/setujui`, { method: 'POST' }), pengajuan.reload)}
                                                >
                                                    Setujui
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-[12.5px] text-muted">{p.catatan_hr ?? '—'}</span>
                                        ),
                                },
                            ]}
                        />
                    )}
                </Muat>
            </Card>

            {tolak && (
                <Modal title="Tolak pengajuan" onClose={() => setTolak(null)}>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            aksiTolak.jalankan(
                                () => api(`/hr/pengajuan/${tolak.id}/tolak`, { method: 'POST', body: { catatan_hr: catatan } }),
                                () => {
                                    setTolak(null);
                                    pengajuan.reload();
                                },
                            );
                        }}
                    >
                        <Umpan aksi={aksiTolak} />
                        <p className="mb-4 text-[13.5px] text-body">
                            Pengajuan <strong>{tolak.karyawan?.nama_karyawan}</strong> untuk <strong>{tolak.pelatihan?.nama_pelatihan}</strong>.
                        </p>
                        <Field label="Alasan penolakan" required hint="Alasan ini dikirim ke karyawan sebagai notifikasi.">
                            <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} required autoFocus />
                        </Field>
                        <div className="mt-5 flex justify-end gap-2">
                            <Button onClick={() => setTolak(null)}>Batal</Button>
                            <Button type="submit" variant="danger" loading={aksiTolak.sibuk}>
                                Tolak Pengajuan
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}

// ---- UC-17 Data karyawan ----------------------------------------------------

export function DataKaryawan() {
    const [saring, setSaring] = useState({ q: '', status: '' });
    const [diterapkan, setDiterapkan] = useState(saring);
    const karyawan = useApi('/hr/karyawan', diterapkan);
    const manager = (karyawan.data ?? []).filter((k) => k.akun?.hak_akses === 'manager');
    const [form, setForm] = useState(null);
    const [nonaktif, setNonaktif] = useState(null);
    const [pesan, setPesan] = useState(null);

    const fields = [
        { name: 'nama_karyawan', label: 'Nama Karyawan', required: true, full: true },
        { name: 'jabatan', label: 'Jabatan', required: true },
        { name: 'unit_kerja', label: 'Unit Kerja', required: true },
        { name: 'username', label: 'Username', required: true, autoComplete: 'off' },
        {
            name: 'password',
            label: 'Kata Sandi',
            type: 'password',
            required: !form?.id,
            autoComplete: 'new-password',
            hint: form?.id ? 'Kosongkan bila tidak diubah' : 'Minimal 8 karakter',
        },
        { name: 'hak_akses', label: 'Hak Akses', type: 'select', options: Object.entries(PERAN) },
        { name: 'manager_id', label: 'Atasan Langsung', type: 'select', options: [['', 'Tidak ada'], ...manager.filter((m) => m.id !== form?.id).map((m) => [m.id, m.nama_karyawan])] },
        ...(form?.id ? [{ name: 'status_karyawan', label: 'Status', type: 'select', options: [['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] }] : []),
    ];

    const tutup = (hasil) => {
        setForm(null);
        setNonaktif(null);

        if (hasil) {
            setPesan(hasil.message);
            karyawan.reload();
        }
    };

    return (
        <>
            <PageHeader
                title="Data Karyawan"
                description="Kelola data karyawan dan akun yang digunakan untuk mengikuti pelatihan."
                action={
                    <Button variant="primary" icon={Plus} onClick={() => setForm({ hak_akses: 'karyawan', manager_id: '' })}>
                        Tambah Karyawan
                    </Button>
                }
            />
            {pesan && <Alert tone="ok" title={pesan} onClose={() => setPesan(null)} className="mb-5" />}

            <Card flush>
                <form
                    className="flex flex-wrap gap-2 border-b border-line p-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setDiterapkan(saring);
                    }}
                >
                    <Input className="min-w-[200px] flex-1" placeholder="Cari nama, jabatan, atau unit kerja" value={saring.q} onChange={(e) => setSaring({ ...saring, q: e.target.value })} />
                    <Select className="w-44" aria-label="Status" value={saring.status} onChange={(e) => setSaring({ ...saring, status: e.target.value })}>
                        <option value="">Semua status</option>
                        <option value="aktif">Aktif</option>
                        <option value="nonaktif">Nonaktif</option>
                    </Select>
                    <Button type="submit" variant="primary" icon={Search}>
                        Cari
                    </Button>
                </form>
                <Muat sumber={karyawan} gagal="Gagal memuat data karyawan">
                    {(data, pesanKosong) => (
                        <Table
                            rows={data}
                            empty={pesanKosong ?? 'Data karyawan tidak ditemukan'}
                            columns={[
                                { label: 'Karyawan', render: (k) => <Orang k={k} /> },
                                { label: 'Unit kerja', render: (k) => k.unit_kerja },
                                { label: 'Username', render: (k) => k.akun?.username ?? '—' },
                                { label: 'Hak akses', render: (k) => PERAN[k.akun?.hak_akses] ?? '—' },
                                { label: 'Status', render: (k) => <StatusBadge value={k.status_karyawan} /> },
                                {
                                    label: 'Aksi',
                                    right: true,
                                    render: (k) => (
                                        <div className="flex justify-end gap-1.5">
                                            <Button size="sm" onClick={() => setForm({ ...k, username: k.akun?.username, hak_akses: k.akun?.hak_akses, manager_id: k.manager_id ?? '', password: '' })}>
                                                Edit
                                            </Button>
                                            {k.status_karyawan === 'aktif' && (
                                                <Button size="sm" variant="danger" onClick={() => setNonaktif(k)}>
                                                    Nonaktifkan
                                                </Button>
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    )}
                </Muat>
            </Card>

            {form && (
                <FormModal
                    judul={form.id ? 'Edit Data Karyawan' : 'Tambah Karyawan'}
                    awal={form}
                    fields={fields}
                    onClose={tutup}
                    onKirim={(nilai) => {
                        const body = Object.fromEntries(fields.map((f) => [f.name, nilai[f.name] === '' ? null : nilai[f.name]]));
                        if (form.id && !body.password) delete body.password;

                        return api(form.id ? `/hr/karyawan/${form.id}` : '/hr/karyawan', { method: form.id ? 'PUT' : 'POST', body });
                    }}
                />
            )}
            {nonaktif && (
                <Konfirmasi judul="Nonaktifkan karyawan" label="Nonaktifkan" onClose={tutup} onYa={() => api(`/hr/karyawan/${nonaktif.id}`, { method: 'DELETE' })}>
                    <strong>{nonaktif.nama_karyawan}</strong> tidak akan dapat login setelah dinonaktifkan. Data pelatihannya tetap tersimpan.
                </Konfirmasi>
            )}
        </>
    );
}

// ---- UC-18 Meninjau skill assessment ----------------------------------------

function DetailAssessment({ id, onClose }) {
    const detail = useApi(`/hr/skill-assessment/${id}`);

    return (
        <Modal title="Detail Hasil Assessment" onClose={onClose}>
            <Muat sumber={detail} gagal="Gagal memuat hasil assessment">
                {(h) => (
                    <>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <Orang k={h.karyawan} />
                            <div className="text-right">
                                <p className="text-xs text-muted">Skor rata-rata</p>
                                <p className="text-2xl font-semibold text-ink">{angka(h.hasil_assessment)}</p>
                            </div>
                        </div>
                        <ul className="space-y-3.5">
                            {h.rincian.map((r) => (
                                <li key={r.id}>
                                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                                        <span className="font-medium text-ink">{r.kompetensi}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-muted">{r.level_kompetensi}</span>
                                            <span className="font-semibold text-ink">{angka(r.skor)}</span>
                                        </span>
                                    </div>
                                    <Progress value={r.skor} tone={r.pencapaian === 'Tercapai' ? 'ok' : 'brand'} />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Muat>
        </Modal>
    );
}

export function TinjauAssessment() {
    const hasil = useApi('/hr/skill-assessment');
    const [detail, setDetail] = useState(null);
    const [cari, setCari] = useState('');
    const [unit, setUnit] = useState('');
    const [jadwal, setJadwal] = useState(false);
    const [pesan, setPesan] = useState(null);

    return (
        <>
            <PageHeader
                title="Skill Assessment"
                description="Tinjau hasil assessment kompetensi berkala karyawan, termasuk skor dan level setiap kompetensi."
                action={
                    <Button variant="primary" icon={CalendarPlus} onClick={() => setJadwal(true)}>
                        Jadwalkan Assessment
                    </Button>
                }
            />
            {pesan && <Alert tone="ok" title={pesan} onClose={() => setPesan(null)} className="mb-5" />}

            <Muat sumber={hasil} gagal="Gagal memuat hasil assessment">
                {(data, pesanKosong) => {
                    const rata = data.length ? data.reduce((n, h) => n + h.hasil_assessment, 0) / data.length : null;

                    return (
                        <>
                            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Stat label="Hasil assessment" value={data.length} hint="Seluruh periode" />
                                <Stat label="Rata-rata skor" value={angka(rata)} hint="Seluruh kompetensi" />
                                <Stat label="Skor 85 ke atas" value={data.filter((h) => h.hasil_assessment >= 85).length} hint="Level Mahir" tone="ok" />
                                <Stat label="Perlu pengembangan" value={data.filter((h) => h.hasil_assessment < 70).length} hint="Skor di bawah 70" tone="bad" />
                            </div>
                            <Card flush>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                                    <Select className="w-[220px]" aria-label="Filter unit kerja" value={unit} onChange={(e) => setUnit(e.target.value)}>
                                        <option value="">Semua unit kerja</option>
                                        {[...new Set(data.map((h) => h.karyawan?.unit_kerja).filter(Boolean))].map((u) => (
                                            <option key={u} value={u}>
                                                {u}
                                            </option>
                                        ))}
                                    </Select>
                                    <SearchInput className="w-full max-w-[280px]" placeholder="Cari karyawan" aria-label="Cari karyawan" value={cari} onChange={(e) => setCari(e.target.value)} />
                                </div>
                                <Table
                                    rows={data.filter((h) => (!unit || h.karyawan?.unit_kerja === unit) && (h.karyawan?.nama_karyawan ?? '').toLowerCase().includes(cari.toLowerCase()))}
                                    empty={pesanKosong ?? 'Belum ada hasil skill assessment'}
                                    columns={[
                                        { label: 'Karyawan', render: (h) => <Orang k={h.karyawan} /> },
                                        { label: 'Unit kerja', render: (h) => h.karyawan?.unit_kerja },
                                        { label: 'Tanggal', render: (h) => tgl(h.created_at) },
                                        {
                                            label: 'Skor',
                                            right: true,
                                            render: (h) => <span className={`font-semibold ${h.hasil_assessment < 70 ? 'text-bad' : ''}`}>{angka(h.hasil_assessment)}</span>,
                                        },
                                        {
                                            label: 'Level',
                                            render: (h) => (
                                                <Badge tone={h.hasil_assessment >= 85 ? 'ok' : h.hasil_assessment >= 70 ? 'neutral' : 'warn'}>
                                                    {h.hasil_assessment >= 85 ? 'Mahir' : h.hasil_assessment >= 70 ? 'Menengah' : h.hasil_assessment >= 50 ? 'Dasar' : 'Pemula'}
                                                </Badge>
                                            ),
                                        },
                                        { label: '', right: true, render: (h) => <Button size="sm" onClick={() => setDetail(h.id)}>Detail</Button> },
                                    ]}
                                />
                            </Card>
                        </>
                    );
                }}
            </Muat>

            {detail && <DetailAssessment id={detail} onClose={() => setDetail(null)} />}
            {jadwal && (
                <FormModal
                    judul="Jadwalkan Skill Assessment"
                    labelSimpan="Jadwalkan"
                    awal={{}}
                    fields={[{ name: 'batas_waktu', label: 'Batas Pengerjaan', type: 'datetime-local', required: true, full: true, hint: 'Seluruh karyawan aktif menerima tugas dan notifikasi.' }]}
                    onKirim={(nilai) => api('/hr/skill-assessment/jadwalkan', { method: 'POST', body: nilai })}
                    onClose={(respons) => {
                        setJadwal(false);
                        if (respons) setPesan(`${respons.message} untuk ${respons.data.jumlah_karyawan} karyawan`);
                    }}
                />
            )}
        </>
    );
}

// ---- Monitoring pelatihan (HR-SRS-04) --------------------------------------

export function Monitoring() {
    const monitoring = useApi('/hr/monitoring');

    return (
        <>
            <PageHeader title="Monitoring Pelatihan" description="Pantau status pelaksanaan, jumlah peserta, kehadiran, dan kelulusan setiap pelatihan." />
            <Muat sumber={monitoring} gagal="Gagal memuat data monitoring">
                {(data, pesan) => (
                    <>
                        <div className="mb-5 grid gap-4 sm:grid-cols-3">
                            <Stat label="Pelatihan" value={data.length} />
                            <Stat label="Total peserta" value={data.reduce((n, p) => n + p.jumlah_peserta, 0)} />
                            <Stat label="Total lulus" value={data.reduce((n, p) => n + p.jumlah_lulus, 0)} tone="ok" />
                        </div>
                        <Card flush>
                            <Table
                                rows={data}
                                empty={pesan ?? 'Belum ada data pelatihan'}
                                columns={[
                                    { label: 'Pelatihan', render: (p) => <Cell title={p.nama_pelatihan} sub={`${p.sesi.length} sesi`} /> },
                                    { label: 'Jenis', render: (p) => <StatusBadge value={p.jenis_pelatihan} dot={false} /> },
                                    { label: 'Status', render: (p) => <StatusBadge value={p.status_pelatihan} /> },
                                    { label: 'Peserta', render: (p) => `${p.jumlah_peserta}/${p.kuota}` },
                                    {
                                        label: 'Kehadiran',
                                        render: (p) => (
                                            <div className="flex min-w-[140px] items-center gap-3">
                                                <Progress value={p.persentase_kehadiran} />
                                                <span className="w-11 text-right font-semibold">{angka(p.persentase_kehadiran)}%</span>
                                            </div>
                                        ),
                                    },
                                    { label: 'Lulus', right: true, render: (p) => p.jumlah_lulus },
                                    { label: '', right: true, render: (p) => <Button size="sm" to={`/hr/pelatihan/${p.id}`}>Kelola</Button> },
                                ]}
                            />
                        </Card>
                    </>
                )}
            </Muat>
        </>
    );
}

// ---- UC-20 Tinjauan nilai KPI -----------------------------------------------

const Chip = ({ tone, children }) => (
    <span
        className={`inline-flex rounded-md border px-2.5 py-1 text-[13px] leading-5 font-medium ${
            { ok: 'border-ok/20 bg-ok-soft text-ok', bad: 'border-bad/20 bg-bad-soft text-bad' }[tone] ?? 'border-line bg-surface text-ink'
        }`}
    >
        {children}
    </span>
);

/** Tabel rincian indikator KPI (frame UI-20 Detail Penilaian). */
export function RincianKpi({ detail }) {
    return (
        <Table
            rows={detail}
            rowKey="indikator"
            columns={[
                { label: 'Indikator KPI', render: (d) => <span className="font-medium">{d.indikator}</span> },
                { label: 'Standar / target KPI', render: (d) => <Chip>{angka(d.target_kpi)}</Chip> },
                { label: 'Capaian aktual', render: (d) => <Chip tone={d.status_kpi === 'Memenuhi KPI' ? 'ok' : 'bad'}>{angka(d.data_kinerja)}</Chip> },
                {
                    label: 'Persentase pencapaian',
                    render: (d) => (
                        <div className="flex min-w-[150px] items-center gap-3">
                            <Progress value={d.capaian} tone={d.status_kpi === 'Memenuhi KPI' ? 'ok' : 'bad'} />
                            <span className="w-12 text-right font-semibold">{angka(d.capaian)}%</span>
                        </div>
                    ),
                },
                {
                    label: 'Status pencapaian',
                    render: (d) => <Badge tone={d.status_kpi === 'Memenuhi KPI' ? 'ok' : 'bad'}>{d.status_kpi === 'Memenuhi KPI' ? 'Memenuhi Target' : 'Belum Memenuhi Target'}</Badge>,
                },
            ]}
        />
    );
}

/** Strip identitas dan empat kartu ringkasan pada detail penilaian KPI. */
export function RingkasanKpi({ karyawan, nilai, penilai }) {
    const detail = nilai?.detail_indikator ?? [];
    const terpenuhi = detail.filter((d) => d.status_kpi === 'Memenuhi KPI').length;

    return (
        <>
            <section className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-line bg-white px-5 py-4">
                <div className="flex items-center gap-3.5">
                    <Avatar name={karyawan.nama_karyawan} size={44} />
                    <div>
                        <p className="text-[15px] leading-[23px] font-semibold text-ink">{karyawan.nama_karyawan}</p>
                        <p className="text-[13px] leading-5 text-muted">{karyawan.jabatan}</p>
                    </div>
                </div>
                <div className="grid flex-1 gap-x-8 gap-y-3 border-line sm:grid-cols-4 lg:border-l lg:pl-6">
                    {[
                        ['Jabatan', karyawan.jabatan],
                        ['Unit kerja', karyawan.unit_kerja],
                        ['Penilai', penilai ?? '—'],
                        ['Terakhir dinilai', nilai ? tgl(nilai.updated_at) : 'Belum pernah'],
                    ].map(([label, isi]) => (
                        <div key={label}>
                            <p className="text-xs leading-[18px] text-muted">{label}</p>
                            <p className="text-sm leading-[21px] font-medium text-ink">{isi}</p>
                        </div>
                    ))}
                </div>
            </section>

            {nilai && (
                <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-brand-tint bg-brand-soft p-5">
                        <p className="text-[13px] leading-5 font-medium text-brand-deep">Nilai Akhir KPI</p>
                        <p className="mt-3 text-[28px] leading-7 font-semibold tracking-[-0.4px] text-ink">
                            {angka(nilai.nilai_akhir)} <span className="text-sm font-normal text-muted">/100</span>
                        </p>
                        <p className="mt-3 text-[12.5px] leading-[19px] text-muted">Dinilai {tgl(nilai.updated_at)}</p>
                    </div>
                    <Stat label="Jumlah Indikator KPI" value={detail.length} hint="Indikator dinilai" />
                    <Stat label="Target Terpenuhi" value={terpenuhi} hint={`dari ${detail.length} indikator`} tone="ok" />
                    <Stat label="Target Belum Terpenuhi" value={detail.length - terpenuhi} hint={`dari ${detail.length} indikator`} tone="bad" />
                </div>
            )}
        </>
    );
}

export function TinjauKpi() {
    const kpi = useApi('/hr/kpi');
    const [cari, setCari] = useState('');
    const [saring, setSaring] = useState('semua');

    return (
        <>
            <PageHeader title="Tinjauan Nilai KPI" description="Indikator, target, dan capaian KPI karyawan berdasarkan penilaian Manager." />
            <Muat sumber={kpi} gagal="Gagal memuat data KPI">
                {(data, pesan) => {
                    const memenuhi = (n) => n.detail_indikator.every((d) => d.status_kpi === 'Memenuhi KPI');
                    const tampil = data
                        .filter((n) => (n.karyawan?.nama_karyawan ?? '').toLowerCase().includes(cari.toLowerCase()))
                        .filter((n) => saring === 'semua' || (saring === 'memenuhi') === memenuhi(n));

                    return (
                        <section className="overflow-hidden rounded-xl border border-line bg-white">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <SearchInput className="w-full max-w-[320px]" placeholder="Cari staf berdasarkan nama" aria-label="Cari staf" value={cari} onChange={(e) => setCari(e.target.value)} />
                                <Segmented
                                    value={saring}
                                    onChange={setSaring}
                                    options={[
                                        ['semua', 'Semua'],
                                        ['memenuhi', 'Memenuhi KPI'],
                                        ['belum', 'Belum Memenuhi'],
                                    ]}
                                />
                            </div>
                            <div className="border-t border-line">
                                <Table
                                    rows={tampil}
                                    empty={data.length ? 'Tidak ada data pada filter ini' : (pesan ?? 'Data penilaian KPI belum tersedia')}
                                    columns={[
                                        { label: 'Nama staf', render: (n) => <Orang k={n.karyawan} /> },
                                        { label: 'Unit kerja', render: (n) => n.karyawan?.unit_kerja },
                                        { label: 'Indikator', render: (n) => n.detail_indikator.length },
                                        { label: 'Status penilaian', render: (n) => <Badge tone={memenuhi(n) ? 'ok' : 'bad'}>{memenuhi(n) ? 'Memenuhi KPI' : 'Belum memenuhi KPI'}</Badge> },
                                        { label: 'Hasil', render: (n) => <span className="font-semibold">{angka(n.nilai_akhir)}</span> },
                                        {
                                            label: '',
                                            right: true,
                                            render: (n) => (
                                                <Button size="sm" to={`/hr/kpi/${n.karyawan_id}`} iconRight={ChevronRight}>
                                                    Lihat Detail
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

export function DetailKpiHr() {
    const { id } = useParams();
    const detail = useApi(`/hr/kpi/${id}`);

    return (
        <Muat sumber={detail} gagal="Gagal memuat data KPI">
            {(k, pesan) => (
                <>
                    <PageHeader
                        title="Detail Penilaian KPI"
                        description={`Hasil penilaian KPI ${k.nama_karyawan} oleh Manager.`}
                        action={
                            <Button icon={ArrowLeft} to="/hr/kpi">
                                Kembali ke Daftar
                            </Button>
                        }
                    />
                    <RingkasanKpi karyawan={k} nilai={k.nilai_kpi} penilai={k.manager?.nama_karyawan} />
                    <Card title="Rincian Indikator KPI" subtitle="Perbandingan standar atau target KPI dengan capaian aktual karyawan" flush>
                        {k.nilai_kpi ? <RincianKpi detail={k.nilai_kpi.detail_indikator} /> : <Empty title={pesan ?? 'Data penilaian KPI belum tersedia'} />}
                    </Card>
                </>
            )}
        </Muat>
    );
}
