import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, CalendarDays, ChevronRight, ClipboardList, Flag, Info, ListChecks, Play, Send } from 'lucide-react';
import { Alert, BackLink, Badge, Button, Card, Cell, Muat, PageHeader, Progress, SearchInput, Select, StatusBadge, Table, Tabs, Umpan, useAksi } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { JENIS_MATERI, JENIS_TUGAS, angka, sisaHari, tgl } from '../../lib/format';

const tautanTugas = (tugas) => (tugas.jenis_tugas === 'skill_assessment' ? '/assessment/isi' : `/tes/${tugas.pelatihan_id}/${tugas.jenis_tugas}`);

const sisa = (batas) => {
    const hari = sisaHari(batas);
    if (hari == null) return null;

    return hari < 0 ? 'Lewat batas' : hari === 0 ? 'Hari ini' : `${hari} hari lagi`;
};

// ---- Halaman utama skill assessment ----------------------------------------

function KartuTes({ tugas }) {
    const perPelatihan = useMemo(() => {
        const peta = new Map();

        tugas
            .filter((t) => t.pelatihan_id)
            .forEach((t) => peta.set(t.pelatihan_id, { nama: t.pelatihan?.nama_pelatihan, ...peta.get(t.pelatihan_id), [t.jenis_tugas]: t }));

        return [...peta.entries()];
    }, [tugas]);

    const [pilihan, setPilihan] = useState('');
    const [, terpilih] = perPelatihan.find(([id]) => String(id) === String(pilihan)) ?? perPelatihan[0] ?? [];

    return (
        <section className="rounded-xl border border-line bg-white">
            <div className="border-b border-line px-6 py-5">
                <p className="text-[12.5px] font-medium text-muted">Tes dalam Program Pelatihan</p>
                <h2 className="mt-1 text-lg leading-[27px] font-semibold text-ink">Pre-Test &amp; Post-Test</h2>
            </div>
            <div className="px-6 py-5">
                {!terpilih ? (
                    <p className="text-[13.5px] text-muted">Belum ada tes. Tes tersedia setelah Anda terdaftar pada pelatihan.</p>
                ) : (
                    <>
                        <label className="block">
                            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">Pilih pelatihan</span>
                            <Select value={pilihan || perPelatihan[0][0]} onChange={(e) => setPilihan(e.target.value)}>
                                {perPelatihan.map(([id, item]) => (
                                    <option key={id} value={id}>
                                        {item.nama}
                                    </option>
                                ))}
                            </Select>
                        </label>
                        <div className="mt-4 space-y-2.5">
                            {['pre_test', 'post_test'].map((jenis) => {
                                const t = terpilih[jenis];
                                if (!t) return null;
                                const selesai = t.status_pengerjaan === 'selesai';

                                return (
                                    <div key={jenis} className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
                                        <Cell title={JENIS_TUGAS[jenis]} sub={selesai ? 'Selesai' : 'Belum Dikerjakan'} />
                                        <Button size="sm" variant={selesai ? 'secondary' : 'primary'} to={tautanTugas(t)} disabled={selesai}>
                                            {JENIS_TUGAS[jenis]}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export function SkillAssessment() {
    const hasil = useApi('/skill-assessment/hasil');
    const tugas = useApi('/tugas');
    const form = useApi('/skill-assessment');

    const semuaTugas = tugas.data ?? [];
    const tugasAssessment = semuaTugas.find((t) => t.jenis_tugas === 'skill_assessment' && t.status_pengerjaan !== 'selesai');
    const riwayat = hasil.data ?? [];
    const grafik = [...riwayat].slice(0, 4).reverse();

    return (
        <>
            <PageHeader
                title="Skill Assessment"
                description="Assessment kompetensi berkala untuk mengukur kompetensi jabatan Anda, serta akses ke pre-test dan post-test pelatihan yang sedang diikuti."
                action={
                    <Button icon={ClipboardList} to="/assessment/tugas">
                        Daftar Tugas
                    </Button>
                }
            />

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                <section className="rounded-xl border border-line bg-white">
                    <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
                        <div>
                            <p className="text-[12.5px] font-medium text-muted">Assessment Kompetensi Berkala</p>
                            <h2 className="mt-1 text-lg leading-[27px] font-semibold text-ink">Penilaian kompetensi jabatan</h2>
                        </div>
                        <Badge tone={tugasAssessment ? 'ok' : 'neutral'}>{tugasAssessment ? 'Periode dibuka' : 'Tidak ada jadwal'}</Badge>
                    </div>
                    <div className="grid divide-line sm:grid-cols-3 sm:divide-x">
                        {[
                            ['Batas pengerjaan', tugasAssessment?.batas_waktu ? `${tgl(tugasAssessment.batas_waktu)} · ${sisa(tugasAssessment.batas_waktu)}` : '—'],
                            ['Komposisi', `${form.data?.kompetensi?.length ?? '—'} kompetensi`],
                            ['Assessment terakhir', riwayat[0] ? tgl(riwayat[0].created_at) : 'Belum pernah'],
                        ].map(([label, nilai]) => (
                            <div key={label} className="px-6 py-4">
                                <p className="text-xs text-muted">{label}</p>
                                <p className="mt-1 text-sm font-medium text-ink">{nilai}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-5">
                        <div className="flex items-center gap-3 text-[13.5px] text-muted">
                            Status Anda:
                            <Badge tone={tugasAssessment ? 'warn' : riwayat.length ? 'ok' : 'neutral'}>
                                {tugasAssessment ? 'Belum Dikerjakan' : riwayat.length ? 'Selesai' : 'Belum ada assessment'}
                            </Badge>
                        </div>
                        <Button variant="primary" icon={Play} to="/assessment/isi">
                            Mulai Kerjakan Assessment
                        </Button>
                    </div>
                    <div className="flex gap-2.5 rounded-b-xl border-t border-line bg-surface px-6 py-3.5 text-[12.5px] leading-5 text-muted">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        Skill assessment adalah pengukuran kompetensi berkala dan terpisah dari pre-test atau post-test di dalam program pelatihan.
                    </div>
                </section>

                <KartuTes tugas={semuaTugas} />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
                <Card title="Riwayat dan Hasil Assessment" subtitle="Hasil assessment kompetensi berkala dari periode sebelumnya" flush>
                    <Muat sumber={hasil} gagal="Gagal memuat hasil assessment">
                        {(data, pesan) => (
                            <Table
                                rows={data}
                                empty={pesan ?? 'Belum ada hasil skill assessment'}
                                columns={[
                                    { label: 'Tanggal', render: (h) => <span className="font-medium">{tgl(h.created_at)}</span> },
                                    { label: 'Skor', right: true, render: (h) => <span className="font-semibold">{angka(h.hasil_assessment)}</span> },
                                    {
                                        label: 'Kompetensi tercapai',
                                        render: (h) => `${h.rincian.filter((r) => r.pencapaian === 'Tercapai').length} dari ${h.rincian.length}`,
                                    },
                                    {
                                        label: 'Perlu dikembangkan',
                                        render: (h) =>
                                            h.rincian
                                                .filter((r) => r.pencapaian !== 'Tercapai')
                                                .map((r) => r.kompetensi)
                                                .join(', ') || '—',
                                    },
                                    { label: 'Status', render: () => <Badge tone="ok">Selesai</Badge> },
                                ]}
                            />
                        )}
                    </Muat>
                </Card>

                <Card title="Perkembangan skor" subtitle="Skor assessment berkala per periode">
                    {grafik.length === 0 ? (
                        <p className="text-[13.5px] text-muted">Belum ada data skor.</p>
                    ) : (
                        <div className="flex h-[180px] items-end gap-3">
                            {grafik.map((h, indeks) => (
                                <div key={h.id} className="flex flex-1 flex-col items-center gap-2">
                                    <span className="text-xs font-semibold text-ink">{angka(h.hasil_assessment)}</span>
                                    <div
                                        className={`w-[38px] max-w-full rounded-t-md ${indeks === grafik.length - 1 ? 'bg-brand-bright' : 'bg-brand-tint'}`}
                                        style={{ height: `${Math.max(4, h.hasil_assessment * 1.3)}px` }}
                                    />
                                    <span className="text-[11px] whitespace-nowrap text-muted">{tgl(h.created_at).replace(/ \d{4}$/, '')}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}

// ---- UC-06 Daftar tugas -----------------------------------------------------

export function DaftarTugas() {
    const tugas = useApi('/tugas');
    const [tab, setTab] = useState('semua');
    const [cari, setCari] = useState('');

    return (
        <>
            <PageHeader
                back={{ to: '/assessment', label: 'Kembali ke Skill Assessment' }}
                title="Daftar Tugas"
                description="Seluruh assessment dan tes yang ditugaskan kepada Anda, beserta status pengerjaan dan batas waktunya."
            />
            <Muat sumber={tugas} gagal="Gagal memuat daftar tugas">
                {(data, pesan) => {
                    const belum = data.filter((t) => t.status_pengerjaan !== 'selesai');
                    const kata = cari.trim().toLowerCase();
                    const tampil = (tab === 'semua' ? data : tab === 'belum' ? belum : data.filter((t) => t.status_pengerjaan === 'selesai')).filter(
                        (t) => !kata || `${t.nama_tugas} ${t.pelatihan?.nama_pelatihan ?? ''}`.toLowerCase().includes(kata),
                    );

                    return (
                        <section className="overflow-hidden rounded-xl border border-line bg-white">
                            <div className="px-5 pt-4">
                                <Tabs
                                    value={tab}
                                    onChange={setTab}
                                    options={[
                                        ['semua', 'Semua', data.length],
                                        ['belum', 'Belum Dikerjakan', belum.length],
                                        ['selesai', 'Selesai', data.length - belum.length],
                                    ]}
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                                <SearchInput className="w-full max-w-[320px]" placeholder="Cari nama tugas" aria-label="Cari nama tugas" value={cari} onChange={(e) => setCari(e.target.value)} />
                                <span className="text-[13px] leading-5 text-muted">{tampil.length} tugas ditampilkan</span>
                            </div>
                            <div className="border-t border-line">
                                <Table
                                    rows={tampil}
                                    empty={data.length ? 'Tidak ada tugas yang cocok' : (pesan ?? 'Belum ada tugas')}
                                    columns={[
                                        { label: 'Nama tugas', render: (t) => <Cell title={t.nama_tugas} sub={t.pelatihan?.nama_pelatihan ?? 'Assessment kompetensi berkala'} /> },
                                        { label: 'Jenis', render: (t) => JENIS_TUGAS[t.jenis_tugas] },
                                        { label: 'Status pengerjaan', render: (t) => <StatusBadge value={t.status_pengerjaan} /> },
                                        {
                                            label: 'Deadline',
                                            render: (t) => (t.batas_waktu ? <Cell title={tgl(t.batas_waktu)} sub={t.status_pengerjaan !== 'selesai' && sisa(t.batas_waktu)} /> : <span className="text-muted">—</span>),
                                        },
                                        {
                                            label: '',
                                            right: true,
                                            render: (t) => (
                                                <Button size="sm" to={tautanTugas(t)} iconRight={ChevronRight} disabled={t.status_pengerjaan === 'selesai'}>
                                                    Detail
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

// ---- UC-07 Mengisi skill assessment -----------------------------------------

export function IsiAssessment() {
    const form = useApi('/skill-assessment');
    const aksi = useAksi();
    const [skor, setSkor] = useState({});
    const [hasil, setHasil] = useState(null);

    if (hasil) {
        return (
            <>
                <PageHeader back={{ to: '/assessment', label: 'Kembali ke Skill Assessment' }} title="Hasil Skill Assessment" description="Hasil ini menjadi dasar rekomendasi pelatihan Anda." />
                <Alert tone="ok" title="Hasil skill assessment berhasil disimpan" className="mb-5" />
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <Card title="Rincian kompetensi" flush>
                        <Table
                            rows={hasil.hasil.rincian}
                            columns={[
                                { label: 'Kompetensi', render: (r) => <span className="font-medium">{r.kompetensi}</span> },
                                { label: 'Skor', right: true, render: (r) => <span className="font-semibold">{angka(r.skor)}</span> },
                                { label: 'Level', render: (r) => r.level_kompetensi },
                                { label: 'Pencapaian', render: (r) => <StatusBadge value={r.pencapaian} /> },
                            ]}
                        />
                    </Card>
                    <Card title="Skor rata-rata">
                        <p className="text-[40px] leading-none font-semibold tracking-[-1px] text-ink">{angka(hasil.hasil.hasil_assessment)}</p>
                        <p className="mt-3 text-[13.5px] text-muted">
                            {hasil.rekomendasi.length
                                ? `${hasil.rekomendasi.length} pelatihan direkomendasikan untuk Anda.`
                                : 'Tidak ada pelatihan yang perlu direkomendasikan saat ini.'}
                        </p>
                        <Button variant="primary" className="mt-4 w-full" to="/rekomendasi" iconRight={ArrowRight}>
                            Lihat Rekomendasi
                        </Button>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <Muat sumber={form} gagal="Gagal memuat formulir assessment">
            {(data) => {
                const terisi = data.kompetensi.filter((k) => skor[k.kompetensi] != null).length;

                const kirim = (event) => {
                    event.preventDefault();
                    aksi.jalankan(
                        () =>
                            api('/skill-assessment', {
                                method: 'POST',
                                body: { jawaban: data.kompetensi.map((k) => ({ kompetensi: k.kompetensi, skor: Number(skor[k.kompetensi]) })) },
                            }),
                        (respons) => setHasil(respons.data),
                    );
                };

                return (
                    <form onSubmit={kirim}>
                        <PageHeader
                            back={{ to: '/assessment', label: 'Kembali ke Skill Assessment' }}
                            eyebrow="Skill Assessment Berkala"
                            title="Assessment Kompetensi"
                            description={`Nilai setiap kompetensi pada skala ${data.skala.min}–${data.skala.max} sesuai kemampuan Anda saat ini.`}
                        />
                        <Umpan aksi={aksi} />
                        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                            <Card flush>
                                <ul className="divide-y divide-line/70">
                                    {data.kompetensi.map((k, indeks) => (
                                        <li key={k.kompetensi} className="px-6 py-5">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <label htmlFor={`k-${indeks}`} className="text-[15px] font-medium text-ink">
                                                    <span className="mr-2 text-muted">{indeks + 1}.</span>
                                                    {k.kompetensi}
                                                </label>
                                                <span className="text-[12.5px] text-muted">Standar {angka(k.standar)}</span>
                                            </div>
                                            <div className="mt-3 flex items-center gap-4">
                                                <input
                                                    id={`k-${indeks}`}
                                                    type="range"
                                                    min={data.skala.min}
                                                    max={data.skala.max}
                                                    step={5}
                                                    value={skor[k.kompetensi] ?? 50}
                                                    onChange={(e) => setSkor({ ...skor, [k.kompetensi]: e.target.value })}
                                                    className="h-1.5 flex-1 accent-brand"
                                                />
                                                <span className={`w-12 text-right text-base font-semibold ${skor[k.kompetensi] == null ? 'text-faint' : 'text-ink'}`}>
                                                    {skor[k.kompetensi] ?? '—'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                            <div className="space-y-4">
                                <Card>
                                    <div className="mb-2 flex justify-between text-[13px]">
                                        <span className="font-medium text-ink">Progres penyelesaian</span>
                                        <span className="font-semibold text-ink">
                                            {terisi}/{data.kompetensi.length}
                                        </span>
                                    </div>
                                    <Progress value={(terisi / data.kompetensi.length) * 100} tone="brand" />
                                    <p className="mt-2 text-xs text-muted">{data.kompetensi.length - terisi} kompetensi belum dinilai</p>
                                </Card>
                                <Button type="submit" variant="primary" icon={Send} className="w-full" loading={aksi.sibuk} disabled={terisi < data.kompetensi.length}>
                                    Selesaikan &amp; Kumpulkan
                                </Button>
                            </div>
                        </div>
                    </form>
                );
            }}
        </Muat>
    );
}

// ---- UC-08 Mengerjakan test -------------------------------------------------

function HasilTes({ data, jenis, pelatihanId }) {
    const lulus = data.hasil.status_kelulusan === 'lulus';

    return (
        <div className="mx-auto max-w-3xl">
            <PageHeader back={{ to: `/pelatihan/${pelatihanId}`, label: 'Kembali ke Detail Pelatihan' }} title={`Hasil ${JENIS_TUGAS[jenis]}`} />
            <Card>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[12.5px] text-muted">Nilai Anda</p>
                        <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-1px] text-ink">{angka(data.hasil.hasil_tes)}</p>
                        <p className="mt-2 text-[13.5px] text-muted">
                            {data.jumlah_benar} dari {data.jumlah_soal} jawaban benar
                            {data.passing_grade != null && ` · passing grade ${angka(data.passing_grade)}`}
                        </p>
                    </div>
                    {data.hasil.status_kelulusan && <StatusBadge value={data.hasil.status_kelulusan} />}
                </div>
            </Card>

            {data.sertifikat && (
                <Card className="mt-5" title="Sertifikat digital">
                    <div className="flex items-start gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok">
                            <Award className="size-5" />
                        </span>
                        <div className="text-[13.5px] text-body">
                            <p className="text-sm font-semibold text-ink">{data.sertifikat.nama_pelatihan}</p>
                            <p className="mt-1">Diberikan kepada {data.sertifikat.nama_karyawan}</p>
                            <p className="mt-1 text-muted">
                                No. {data.sertifikat.nomor} · terbit {tgl(data.sertifikat.tanggal_terbit)}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {jenis === 'post_test' && !lulus && (
                <Card className="mt-5" title="Materi perbaikan" subtitle="Pelajari kembali materi berikut, lalu kerjakan ulang post-test" flush>
                    <Table
                        rows={data.materi_perbaikan}
                        empty="Materi perbaikan belum tersedia"
                        columns={[
                            { label: 'Judul materi', render: (m) => <span className="font-medium">{m.judul_materi}</span> },
                            { label: 'Jenis', render: (m) => JENIS_MATERI[m.jenis_materi] ?? m.jenis_materi },
                            { label: 'Lokasi', render: (m) => m.lokasi_materi },
                        ]}
                    />
                </Card>
            )}
        </div>
    );
}

const KETENTUAN = [
    'Setiap soal memiliki satu jawaban yang benar.',
    'Gunakan Tandai Ragu-ragu untuk soal yang ingin ditinjau ulang sebelum dikumpulkan.',
    'Soal yang belum dijawab saat dikumpulkan dihitung salah.',
    'Pre-test hanya dapat dikerjakan satu kali; post-test dapat diulang selama belum lulus.',
    'Nilai tes pelatihan mengukur pemahaman materi dan tidak sama dengan penilaian kinerja (KPI).',
];

/** Kepala halaman pengerjaan: label, judul, dan kotak ringkasan di kanan. */
function KepalaKuis({ label, title, sub, kotak }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                <Badge tone="brand" dot={false}>
                    {label}
                </Badge>
                <h1 className="pt-2.5 text-[26px] leading-[30px] font-semibold tracking-[-0.39px] text-ink">{title}</h1>
                {sub && <p className="pt-1 text-sm leading-[21px] text-muted">{sub}</p>}
            </div>
            <div className="flex gap-2">
                {kotak.map(([nama, nilai]) => (
                    <div key={nama} className="rounded-lg border border-line bg-white px-[15px] py-[9px]">
                        <p className="text-xs leading-[18px] text-muted">{nama}</p>
                        <p className="text-[15px] leading-[23px] font-semibold text-ink">{nilai}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Halaman pembuka tes (frame UI-08): pemilih pelatihan, info tes, ketentuan. */
function PembukaTes({ id, jenis, soal, tugas, onMulai }) {
    const navigate = useNavigate();
    const perPelatihan = [...new Map(tugas.filter((t) => t.pelatihan_id).map((t) => [t.pelatihan_id, t.pelatihan?.nama_pelatihan])).entries()];
    const nama = perPelatihan.find(([pid]) => String(pid) === id)?.[1] ?? 'Pelatihan';
    const tugasIni = tugas.find((t) => String(t.pelatihan_id) === id && t.jenis_tugas === jenis);
    const jumlah = soal.data?.length ?? 0;
    const siap = !soal.loading && !soal.error && jumlah > 0;

    return (
        <div className="mx-auto max-w-[896px]">
            <BackLink to="/assessment">Kembali ke Skill Assessment</BackLink>

            <section className="flex flex-wrap items-end gap-x-7 gap-y-3 rounded-xl border border-line bg-white p-[17px]">
                <label className="block min-w-[240px] flex-1">
                    <span className="block text-xs leading-[18px] text-muted">Pelatihan</span>
                    <Select className="mt-1" value={id} onChange={(e) => navigate(`/tes/${e.target.value}/${jenis}`)}>
                        {!perPelatihan.some(([pid]) => String(pid) === id) && <option value={id}>{nama}</option>}
                        {perPelatihan.map(([pid, label]) => (
                            <option key={pid} value={pid}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </label>
                <div className="flex flex-wrap gap-2">
                    {['pre_test', 'post_test'].map((j) => (
                        <Button key={j} variant={j === jenis ? 'soft' : 'secondary'} aria-pressed={j === jenis} to={`/tes/${id}/${j}`}>
                            {JENIS_TUGAS[j]}
                        </Button>
                    ))}
                    <Button variant="ghost" icon={ClipboardList} to="/assessment/isi">
                        Mulai Kerjakan Assessment
                    </Button>
                </div>
            </section>

            {soal.error && (
                <Alert
                    tone="warn"
                    title={`${JENIS_TUGAS[jenis]} belum tersedia`}
                    className="mt-5"
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" icon={CalendarDays} to="/jadwal">
                                Lihat Jadwal Pelatihan
                            </Button>
                            {jenis === 'post_test' && (
                                <Button size="sm" variant="ghost" to={`/tes/${id}/pre_test`}>
                                    Buka Pre-Test
                                </Button>
                            )}
                        </div>
                    }
                >
                    {soal.error.message}
                </Alert>
            )}

            <section className="mt-5 rounded-xl border border-line bg-white">
                <div className="p-6">
                    <Badge tone="brand" dot={false}>
                        {JENIS_TUGAS[jenis]}
                    </Badge>
                    <h1 className="pt-3 text-2xl leading-[33px] font-semibold tracking-[-0.36px] text-ink">
                        {JENIS_TUGAS[jenis]} {nama}
                    </h1>
                    <p className="pt-1 text-sm leading-[21px] text-muted">{nama}</p>
                </div>

                <div className="border-t border-line p-6">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Informasi Jumlah Soal', soal.loading ? 'Memuat…' : `${jumlah} soal pilihan ganda`],
                            ['Jenis Tes', JENIS_TUGAS[jenis]],
                            ['Batas Pengerjaan', tugasIni?.batas_waktu ? tgl(tugasIni.batas_waktu) : '—'],
                            ['Status Tugas', tugasIni ? (tugasIni.status_pengerjaan === 'selesai' ? 'Selesai' : 'Belum dikerjakan') : '—'],
                        ].map(([label, nilai]) => (
                            <div key={label}>
                                <dt className="text-[12.5px] leading-[19px] text-muted">{label}</dt>
                                <dd className="pt-1 text-sm leading-[21px] font-medium text-ink">{nilai}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-6 rounded-[10px] bg-surface p-5">
                        <p className="flex items-center gap-2 text-[13.5px] leading-5 font-semibold text-ink">
                            <ListChecks className="size-4 text-brand" /> Ketentuan pengerjaan
                        </p>
                        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13.5px] leading-[21px] text-body marker:text-faint">
                            {KETENTUAN.map((butir) => (
                                <li key={butir}>{butir}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
                    <Button icon={ArrowLeft} to="/assessment/tugas">
                        Daftar Tugas
                    </Button>
                    <Button variant="primary" icon={Play} disabled={!siap} onClick={onMulai}>
                        Mulai Kerjakan
                    </Button>
                </div>
            </section>
        </div>
    );
}

export function KerjakanTes() {
    const { id, jenis } = useParams();
    const soal = useApi(`/pelatihan/${id}/tes/${jenis}`);
    const tugas = useApi('/tugas');
    const aksi = useAksi();
    const [mulai, setMulai] = useState(false);
    const [jawaban, setJawaban] = useState({});
    const [ragu, setRagu] = useState({});
    const [posisi, setPosisi] = useState(0);
    const [hasil, setHasil] = useState(null);

    useEffect(() => {
        setMulai(false);
        setJawaban({});
        setRagu({});
        setPosisi(0);
        setHasil(null);
    }, [id, jenis]);

    if (hasil) return <HasilTes data={hasil} jenis={jenis} pelatihanId={id} />;

    const daftar = soal.data ?? [];

    if (!mulai || daftar.length === 0) {
        return <PembukaTes id={id} jenis={jenis} soal={soal} tugas={tugas.data ?? []} onMulai={() => setMulai(true)} />;
    }

    const nama = (tugas.data ?? []).find((t) => String(t.pelatihan_id) === id)?.pelatihan?.nama_pelatihan;
    const aktif = daftar[posisi];
    const terjawab = daftar.filter((s) => jawaban[s.id]).length;
    const jumlahRagu = daftar.filter((s) => ragu[s.id]).length;

    const kumpulkan = () =>
        aksi.jalankan(() => api(`/pelatihan/${id}/tes/${jenis}`, { method: 'POST', body: { jawaban } }), (respons) => setHasil(respons.data));

    return (
        <>
            <KepalaKuis label={JENIS_TUGAS[jenis]} title={`${JENIS_TUGAS[jenis]} ${nama ?? ''}`} sub={nama} kotak={[['Jumlah Soal', `${daftar.length} soal`]]} />
            <Umpan aksi={aksi} />

            <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
                <section className="rounded-xl border border-line bg-white">
                    <div className="flex h-[54px] items-center justify-between border-b border-line px-6 text-sm text-muted">
                        <span>
                            Soal <strong className="font-semibold text-ink">{posisi + 1}</strong> dari {daftar.length}
                        </span>
                        {ragu[aktif.id] && <Badge tone="warn">Ditandai ragu-ragu</Badge>}
                    </div>
                    <div role="radiogroup" aria-labelledby="teks-soal" className="px-8 py-7">
                        <p id="teks-soal" className="text-[19px] leading-[29px] font-medium text-ink">
                            {aktif.pertanyaan}
                        </p>
                        <div className="mt-7 space-y-2.5">
                            {Object.entries(aktif.pilihan).map(([kunci, teks]) => {
                                const dipilih = jawaban[aktif.id] === kunci;

                                return (
                                    <label
                                        key={kunci}
                                        className={`flex min-h-[62px] items-center gap-4 rounded-[10px] border px-[17px] py-3.5 ${dipilih ? 'border-brand-bright bg-brand-soft' : 'border-line hover:bg-surface'}`}
                                    >
                                        <span
                                            className={`flex size-8 shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold ${dipilih ? 'border-brand bg-brand text-white' : 'border-line bg-white text-muted'}`}
                                        >
                                            {kunci}
                                        </span>
                                        <span className="flex-1 text-[14.5px] leading-[21px] text-ink">{teks}</span>
                                        <input
                                            type="radio"
                                            name={`soal-${aktif.id}`}
                                            checked={dipilih}
                                            onChange={() => setJawaban({ ...jawaban, [aktif.id]: kunci })}
                                            className="size-[18px] accent-brand"
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-4">
                        <Button icon={ArrowLeft} disabled={posisi === 0} onClick={() => setPosisi(posisi - 1)}>
                            Soal Sebelumnya
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="soft" icon={Flag} onClick={() => setRagu({ ...ragu, [aktif.id]: !ragu[aktif.id] })}>
                                {ragu[aktif.id] ? 'Batalkan Ragu-ragu' : 'Tandai Ragu-ragu'}
                            </Button>
                            <Button variant="primary" iconRight={ArrowRight} disabled={posisi === daftar.length - 1} onClick={() => setPosisi(posisi + 1)}>
                                Lanjut
                            </Button>
                        </div>
                    </div>
                </section>

                <aside className="space-y-4">
                    <div className="rounded-xl border border-line bg-white p-[21px]">
                        <div className="flex justify-between text-[13px] leading-5">
                            <span className="font-medium text-ink">Progres penyelesaian</span>
                            <span className="font-semibold text-ink">
                                {terjawab}/{daftar.length}
                            </span>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-track">
                            <div className="h-full rounded-full bg-brand-bright" style={{ width: `${(terjawab / daftar.length) * 100}%` }} />
                        </div>
                        <p className="pt-2 text-xs leading-[18px] text-muted">
                            {daftar.length - terjawab} belum dijawab · {jumlahRagu} ragu-ragu
                        </p>
                    </div>
                    <div className="rounded-xl border border-line bg-white p-[21px]">
                        <p className="text-[13px] leading-5 font-semibold text-ink">Nomor Soal</p>
                        <div className="mt-3 grid grid-cols-6 gap-1.5">
                            {daftar.map((s, indeks) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setPosisi(indeks)}
                                    aria-label={`Soal ${indeks + 1}`}
                                    aria-current={indeks === posisi}
                                    className={`flex h-9 items-center justify-center rounded-md border text-[13px] font-medium ${
                                        ragu[s.id]
                                            ? 'border-warn/40 bg-warn-soft text-warn-ink'
                                            : jawaban[s.id]
                                              ? 'border-brand bg-brand text-white'
                                              : 'border-line bg-white text-ink'
                                    } ${indeks === posisi ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                                >
                                    {indeks + 1}
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
                            {[
                                ['bg-brand', 'Terjawab'],
                                ['bg-warn-soft ring-1 ring-warn/40', 'Ragu-ragu'],
                                ['bg-white ring-1 ring-line', 'Belum'],
                            ].map(([warna, label]) => (
                                <span key={label} className="inline-flex items-center gap-1.5">
                                    <span className={`size-2 rounded-full ${warna}`} />
                                    {label}
                                </span>
                            ))}
                        </p>
                    </div>
                    <Button variant="primary" icon={Send} className="w-full" loading={aksi.sibuk} onClick={kumpulkan}>
                        Selesaikan &amp; Kumpulkan
                    </Button>
                </aside>
            </div>
        </>
    );
}
