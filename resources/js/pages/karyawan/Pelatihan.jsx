import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin, Search, UserCheck } from 'lucide-react';
import { Alert, BackLink, Badge, Button, Card, Cell, Empty, Field, Modal, Muat, SearchInput, Select, StatusBadge, Table, Tag, Textarea, Umpan, useAksi } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { JENIS_MATERI, hariIni, rentangJam, tgl, tglPanjang } from '../../lib/format';
import { statusSesi } from './Aktivitas';

const jadwalSesi = (item) => {
    const sesi = item.jadwal_pelatihan?.[0];

    return sesi ? `${tglPanjang(sesi.tanggal_pelatihan)} · ${rentangJam(sesi)}` : `${tglPanjang(item.jadwal)} · sesi belum dijadwalkan`;
};

const TagJenis = ({ jenis }) => <Tag tone={jenis === 'wajib' ? 'brand' : 'neutral'}>{jenis === 'wajib' ? 'Wajib' : 'Umum'}</Tag>;

const TAG_STATUS = {
    terdaftar: ['Terdaftar', 'ok'],
    selesai: ['Selesai', 'ok'],
    diajukan: ['Menunggu persetujuan', 'warn'],
    ditolak: ['Pengajuan ditolak', 'bad'],
};

/** Judul halaman gaya frame UI-09/10/12: judul 26px dan satu baris keterangan. */
function Judul({ title, children }) {
    return (
        <div className="mb-6">
            <h1 className="text-[26px] leading-[1.45] font-semibold text-ink">{title}</h1>
            <p className="mt-[5px] text-[14.5px] leading-[1.45] text-muted">{children}</p>
        </div>
    );
}

function Ringkasan({ items }) {
    return (
        <section className="mb-6 grid gap-x-7 gap-y-4 rounded-xl border border-line bg-white p-6 sm:grid-cols-3">
            {items.map(([label, nilai]) => (
                <div key={label}>
                    <p className="text-[12.5px] leading-[1.45] text-muted">{label}</p>
                    <p className="mt-[5px] text-lg leading-[1.45] font-semibold text-ink">{nilai}</p>
                </div>
            ))}
        </section>
    );
}

function KartuPelatihan({ item, status }) {
    const [label, nada] = status ?? ['Dapat diikuti', 'neutral'];

    return (
        <section className="rounded-xl border border-line bg-white p-6">
            <div className="flex flex-wrap gap-2.5">
                <TagJenis jenis={item.jenis_pelatihan} />
                <Tag tone={nada}>{label}</Tag>
            </div>
            <h2 className="mt-3 text-lg leading-[1.45] font-semibold text-ink">{item.nama_pelatihan}</h2>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
                <div className="space-y-1 text-[13px] leading-[1.45] text-muted">
                    <p>{jadwalSesi(item)}</p>
                    <p>
                        {item.peserta_count ?? 0} dari {item.kuota} peserta
                    </p>
                </div>
                <Button to={`/pelatihan/${item.id}`}>Lihat Detail</Button>
            </div>
        </section>
    );
}

// ---- Daftar pelatihan tersedia + pengajuan (PGN-SRS-03, UC-10) -------------

export function DaftarPelatihan() {
    const [saring, setSaring] = useState({ q: '', jenis: '' });
    const [diterapkan, setDiterapkan] = useState(saring);
    const pelatihan = useApi('/pelatihan', diterapkan);
    const pengajuan = useApi('/pengajuan-pelatihan');

    return (
        <>
            <Judul title="Daftar Pelatihan">Temukan pelatihan yang tersedia. Pelatihan umum dapat diajukan; pelatihan wajib ditetapkan oleh HR/PSDM.</Judul>

            <form
                className="mb-6 flex flex-wrap gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    setDiterapkan(saring);
                }}
            >
                <SearchInput className="min-w-[220px] flex-1" placeholder="Cari nama pelatihan" aria-label="Cari nama pelatihan" value={saring.q} onChange={(e) => setSaring({ ...saring, q: e.target.value })} />
                <Select className="w-[180px]" value={saring.jenis} onChange={(e) => setSaring({ ...saring, jenis: e.target.value })} aria-label="Jenis pelatihan">
                    <option value="">Semua jenis</option>
                    <option value="wajib">Wajib</option>
                    <option value="umum">Umum</option>
                </Select>
                <Button type="submit" variant="primary" icon={Search}>
                    Cari
                </Button>
            </form>

            <Muat sumber={pelatihan} gagal="Gagal memuat daftar pelatihan">
                {(data, pesan) => {
                    const terdaftar = data.filter((p) => ['terdaftar', 'selesai'].includes(p.status_pendaftaran)).length;

                    return data.length === 0 ? (
                        <Card>
                            <Empty title={pesan ?? 'Pelatihan tidak ditemukan'}>Ubah kata kunci atau filter pencarian.</Empty>
                        </Card>
                    ) : (
                        <>
                            <Ringkasan
                                items={[
                                    ['Pelatihan tersedia', `${data.length} pelatihan`],
                                    ['Sudah terdaftar', `${terdaftar} pelatihan`],
                                    ['Dapat diikuti', `${data.filter((p) => !p.status_pendaftaran && p.jenis_pelatihan === 'umum').length} pelatihan`],
                                ]}
                            />
                            <div className="space-y-6">
                                {data.map((item) => (
                                    <KartuPelatihan
                                        key={item.id}
                                        item={item}
                                        status={TAG_STATUS[item.status_pendaftaran] ?? (item.jenis_pelatihan === 'wajib' ? ['Ditetapkan HR/PSDM', 'neutral'] : undefined)}
                                    />
                                ))}
                            </div>
                        </>
                    );
                }}
            </Muat>

            <Card className="mt-8" title="Pengajuan saya" subtitle="Status pengajuan pelatihan yang Anda kirim" flush>
                <Muat sumber={pengajuan} gagal="Gagal memuat pengajuan">
                    {(data) => (
                        <Table
                            rows={data}
                            empty="Belum ada pengajuan pelatihan"
                            columns={[
                                { label: 'Pelatihan', render: (b) => <Cell title={b.pelatihan?.nama_pelatihan} sub={b.alasan_pengajuan} /> },
                                { label: 'Diajukan', render: (b) => tgl(b.tanggal_daftar) },
                                { label: 'Status', render: (b) => <StatusBadge value={b.status_peserta} /> },
                                { label: 'Catatan HR', render: (b) => b.catatan_hr ?? '—' },
                            ]}
                        />
                    )}
                </Muat>
            </Card>
        </>
    );
}

// ---- UC-09 Pelatihan aktif --------------------------------------------------

export function PelatihanAktif() {
    const aktif = useApi('/pelatihan-aktif');

    return (
        <>
            <Judul title="Pelatihan Aktif">Lanjutkan sesi pelatihan yang sedang Anda ikuti.</Judul>
            <Muat sumber={aktif} gagal="Gagal memuat daftar pelatihan aktif">
                {(data, pesan) =>
                    data.length === 0 ? (
                        <Card>
                            <Empty
                                title={pesan ?? 'Sesi pelatihan belum tersedia'}
                                action={
                                    <Button to={pesan?.includes('riwayat') ? '/riwayat' : '/pelatihan'}>{pesan?.includes('riwayat') ? 'Lihat Riwayat' : 'Cari Pelatihan'}</Button>
                                }
                            />
                        </Card>
                    ) : (
                        <>
                            <Ringkasan
                                items={[
                                    ['Pelatihan aktif', `${data.length} pelatihan`],
                                    ['Pelatihan wajib', `${data.filter((p) => p.jenis_pelatihan === 'wajib').length} pelatihan`],
                                    ['Total sesi', `${data.reduce((n, p) => n + (p.jadwal_pelatihan?.length ?? 0), 0)} sesi`],
                                ]}
                            />
                            <div className="space-y-6">
                                {data.map((item) => (
                                    <KartuPelatihan key={item.id} item={item} status={TAG_STATUS.terdaftar} />
                                ))}
                            </div>
                        </>
                    )
                }
            </Muat>
        </>
    );
}

// ---- UC-10 Detail pelatihan -------------------------------------------------

function FormPengajuan({ pelatihan, onClose, onSelesai }) {
    const aksi = useAksi();
    const [alasan, setAlasan] = useState('');

    const kirim = (event) => {
        event.preventDefault();
        aksi.jalankan(() => api(`/pelatihan/${pelatihan.id}/daftar`, { method: 'POST', body: { alasan_pengajuan: alasan } }), onSelesai);
    };

    return (
        <Modal title="Ajukan pendaftaran pelatihan" onClose={onClose}>
            <form onSubmit={kirim}>
                <Umpan aksi={aksi} />
                <p className="mb-4 text-[13.5px] text-body">
                    Pengajuan untuk <strong>{pelatihan.nama_pelatihan}</strong> akan ditinjau oleh HR/PSDM.
                </p>
                <Field label="Alasan pengajuan" required hint="Jelaskan kaitan pelatihan ini dengan kebutuhan pekerjaan Anda.">
                    <Textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} required maxLength={1000} autoFocus />
                </Field>
                <div className="mt-5 flex justify-end gap-2">
                    <Button onClick={onClose}>Batal</Button>
                    <Button type="submit" variant="primary" loading={aksi.sibuk}>
                        Kirim Pengajuan
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function Baris({ label, children }) {
    return (
        <div className="flex gap-5 leading-[1.45]">
            <dt className="w-[190px] shrink-0 text-[13px] text-muted">{label}</dt>
            <dd className="text-sm font-medium text-ink">{children}</dd>
        </div>
    );
}

export function DetailPelatihan() {
    const { id } = useParams();
    const detail = useApi(`/pelatihan/${id}`);
    const pengajuan = useApi('/pengajuan-pelatihan');
    const [form, setForm] = useState(false);
    const [pesan, setPesan] = useState(null);

    return (
        <Muat sumber={detail} gagal="Gagal memuat detail pelatihan">
            {(p) => {
                const milikku = (pengajuan.data ?? []).find((item) => item.pelatihan_id === p.id);
                const sisa = Math.max(0, p.kuota - (p.peserta_count ?? 0));
                const sesi = p.jadwal_pelatihan ?? [];

                // Status kepesertaan: [label tag, nada, judul, keterangan].
                const status = p.sudah_terdaftar
                    ? ['Terdaftar', 'ok', 'Anda sudah terdaftar', 'Materi dan presensi sesi ini sudah dapat Anda akses.']
                    : p.jenis_pelatihan === 'wajib'
                      ? ['Pelatihan Wajib', 'brand', 'Belum ditugaskan', 'Peserta pelatihan wajib ditetapkan oleh HR/PSDM. Anda belum ditugaskan pada sesi ini.']
                      : milikku?.status_peserta === 'diajukan'
                        ? ['Menunggu Persetujuan', 'warn', 'Pengajuan terkirim', 'HR/PSDM sedang meninjau pengajuan pendaftaran Anda.']
                        : sisa === 0
                          ? ['Kuota Penuh', 'bad', 'Kuota pelatihan penuh', 'Seluruh tempat pada sesi ini sudah terisi.']
                          : [
                                'Dapat Diikuti',
                                'neutral',
                                'Belum terdaftar',
                                milikku?.status_peserta === 'ditolak'
                                    ? `Pengajuan sebelumnya ditolak: ${milikku.catatan_hr}. Anda dapat mengajukan kembali.`
                                    : `Tersedia ${sisa} tempat. Daftarkan diri Anda untuk memperoleh akses materi dan presensi.`,
                            ];

                return (
                    <>
                        <BackLink to="/pelatihan">Kembali ke Daftar Pelatihan</BackLink>
                        <Judul title={p.nama_pelatihan}>Informasi sesi pelatihan dan status kepesertaan Anda.</Judul>

                        {pesan && <Alert tone="ok" title={pesan} onClose={() => setPesan(null)} className="mb-6" />}

                        <div className="grid items-start gap-6 lg:grid-cols-[1fr_416px]">
                            <section className="rounded-xl border border-line bg-white p-6">
                                <h2 className="text-[17px] leading-[1.45] font-semibold text-ink">Overview Pelatihan</h2>
                                <div className="mt-5">
                                    <TagJenis jenis={p.jenis_pelatihan} />
                                </div>
                                <dl className="mt-5 space-y-5">
                                    <Baris label="Jadwal">{jadwalSesi(p)}</Baris>
                                    <Baris label="Status sesi">{p.status_pelatihan === 'aktif' ? 'Aktif' : 'Tidak aktif'}</Baris>
                                    <Baris label="Kuota peserta">
                                        {p.peserta_count ?? 0} dari {p.kuota} peserta
                                    </Baris>
                                    {p.kompetensi && <Baris label="Kompetensi">{p.kompetensi}</Baris>}
                                </dl>
                                <hr className="my-5 border-line" />
                                <p className="text-sm leading-[1.45] text-muted">
                                    {p.sudah_terdaftar ? (p.deskripsi ?? 'Anda terdaftar sebagai peserta sesi ini.') : 'Materi dan presensi tersedia setelah Anda terdaftar sebagai peserta sesi ini.'}
                                </p>
                            </section>

                            <section className="rounded-xl border border-line bg-white p-6">
                                <Tag tone={status[1]}>{status[0]}</Tag>
                                <h2 className="mt-4 text-lg leading-[1.45] font-semibold text-ink">{status[2]}</h2>
                                <p className="mt-4 text-sm leading-[1.45] text-muted">{status[3]}</p>
                                {p.sudah_terdaftar ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button variant="primary" to={`/pelatihan/${p.id}/materi`}>
                                            Lihat Materi
                                        </Button>
                                        <Button to={`/tes/${p.id}/pre_test`}>Pre-Test</Button>
                                        <Button to={`/tes/${p.id}/post_test`}>Post-Test</Button>
                                    </div>
                                ) : (
                                    status[0] === 'Dapat Diikuti' && (
                                        <Button variant="primary" className="mt-4" onClick={() => setForm(true)}>
                                            Ikuti Pelatihan
                                        </Button>
                                    )
                                )}
                            </section>
                        </div>

                        {p.sudah_terdaftar && (
                            <section className="mt-6 rounded-xl border border-line bg-white p-6">
                                <h2 className="text-[17px] leading-[1.45] font-semibold text-ink">Sesi dan Presensi</h2>
                                {sesi.length === 0 ? (
                                    <p className="mt-4 text-sm text-muted">Sesi pelatihan belum tersedia.</p>
                                ) : (
                                    <ul className="mt-2 divide-y divide-line">
                                        {sesi.map((s, indeks) => (
                                            <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-ink">
                                                        Sesi {indeks + 1} · {tglPanjang(s.tanggal_pelatihan)}
                                                    </p>
                                                    <p className="mt-1 text-[13px] text-muted">
                                                        {rentangJam(s)} · {s.lokasi}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <StatusBadge value={statusSesi(s)} />
                                                    {s.status_jadwal === 'dibuka' && !s.sudah_presensi && (
                                                        <Button variant="primary" icon={UserCheck} to={`/presensi/${s.id}`}>
                                                            Isi Presensi
                                                        </Button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        )}

                        {form && (
                            <FormPengajuan
                                pelatihan={p}
                                onClose={() => setForm(false)}
                                onSelesai={(hasil) => {
                                    setForm(false);
                                    setPesan(hasil.message);
                                    pengajuan.reload();
                                }}
                            />
                        )}
                    </>
                );
            }}
        </Muat>
    );
}

// ---- UC-12 Materi pelatihan -------------------------------------------------

export function MateriPelatihan() {
    const { id } = useParams();
    const detail = useApi(`/pelatihan/${id}`);

    return (
        <Muat sumber={detail} gagal="Materi gagal dimuat">
            {(p) => (
                <>
                    <BackLink to={`/pelatihan/${id}`}>Kembali ke Detail Pelatihan</BackLink>
                    <Judul title="Materi Pelatihan">{p.nama_pelatihan}</Judul>

                    <section className="mb-6 flex flex-wrap items-start justify-between gap-6 rounded-xl border border-line bg-white p-6">
                        <div>
                            <p className="text-[17px] leading-[1.45] font-semibold text-ink">{p.nama_pelatihan}</p>
                            <p className="mt-1 text-[13px] leading-[1.45] text-muted">{jadwalSesi(p)}</p>
                        </div>
                        <Tag tone={p.sudah_terdaftar ? 'ok' : 'neutral'}>{p.sudah_terdaftar ? 'Terdaftar' : 'Belum terdaftar'}</Tag>
                    </section>

                    <section className="rounded-xl border border-line bg-white p-6">
                        <h2 className="text-[17px] leading-[1.45] font-semibold text-ink">Daftar Materi</h2>
                        {!p.sudah_terdaftar ? (
                            <Empty title="Akses materi ditolak" action={<Button to={`/pelatihan/${id}`}>Kembali ke Detail Pelatihan</Button>}>
                                Materi hanya dapat dibuka oleh peserta yang terdaftar pada sesi ini.
                            </Empty>
                        ) : p.materi.length === 0 ? (
                            <Empty title="Materi belum tersedia">HR/PSDM belum menerbitkan materi untuk pelatihan ini.</Empty>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left">
                                    <thead>
                                        <tr className="bg-surface text-xs text-muted">
                                            <th className="w-[86px] py-[11px] pl-0 font-normal">Urutan</th>
                                            <th className="py-[11px] font-normal">Judul materi</th>
                                            <th className="w-[176px] py-[11px] font-normal">Jenis</th>
                                            <th className="w-[230px] py-[11px] font-normal">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {p.materi.map((m) => (
                                            <tr key={m.id} className="h-[70px] border-b border-line text-sm text-ink">
                                                <td>{m.urutan}</td>
                                                <td>{m.judul_materi}</td>
                                                <td>{JENIS_MATERI[m.jenis_materi] ?? m.jenis_materi}</td>
                                                <td>
                                                    {/^https?:\/\//.test(m.lokasi_materi) ? (
                                                        <a
                                                            href={m.lokasi_materi}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium hover:bg-surface"
                                                        >
                                                            Buka Materi <ExternalLink className="size-3.5" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-[13px] text-muted" title="Lokasi berkas materi">
                                                            {m.lokasi_materi}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </Muat>
    );
}

// ---- UC-11 Mengisi presensi -------------------------------------------------

export function Presensi() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { nama, karyawan } = useAuth();
    const jadwal = useApi('/jadwal-pelatihan');
    const aksi = useAksi();

    return (
        <Muat sumber={jadwal} gagal="Gagal memuat sesi pelatihan">
            {(data) => {
                const sesi = data.find((s) => String(s.id) === id);

                if (!sesi) {
                    return (
                        <Card>
                            <Empty title="Sesi tidak ditemukan" action={<Button to="/jadwal">Kembali ke Jadwal Pelatihan</Button>}>
                                Anda bukan peserta sesi ini, atau sesi sudah dihapus.
                            </Empty>
                        </Card>
                    );
                }

                const sesama = data.filter((s) => s.pelatihan_id === sesi.pelatihan_id);
                const tercatat = sesi.sudah_presensi || Boolean(aksi.sukses);
                const dibuka = sesi.status_jadwal === 'dibuka';

                return (
                    <div className="mx-auto max-w-[1024px]">
                        <BackLink to="/jadwal">Kembali ke Jadwal Pelatihan</BackLink>
                        <h1 className="text-[26px] leading-[33px] font-semibold tracking-[-0.39px] text-ink">Presensi Pelatihan</h1>
                        <p className="mt-1.5 mb-7 text-[14.5px] leading-6 text-muted">Catat kehadiran Anda untuk sesi pelatihan yang berlangsung.</p>

                        <Umpan aksi={aksi} />
                        {!dibuka && !tercatat && (
                            <Alert tone="warn" title="Presensi tidak tersedia" className="mb-5">
                                Sesi ini belum dibuka atau sudah ditutup oleh HR/PSDM.
                            </Alert>
                        )}

                        <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
                            <section className="rounded-xl border border-line bg-white">
                                <div className="px-6 py-5">
                                    <p className="text-[12.5px] leading-[19px] font-medium text-muted">Informasi Nama Pelatihan</p>
                                    <h2 className="pt-1 text-[22px] leading-[29px] font-semibold tracking-[-0.3px] text-ink">{sesi.pelatihan?.nama_pelatihan}</h2>
                                    <p className="pt-0.5 text-sm leading-[21px] text-muted">
                                        Sesi {sesama.findIndex((s) => s.id === sesi.id) + 1} dari {sesama.length}
                                    </p>
                                </div>

                                <div className="grid border-y border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
                                    <div className="px-6 py-4">
                                        <p className="text-xs leading-[18px] text-muted">Informasi Identitas Karyawan</p>
                                        <p className="pt-1 text-sm leading-[21px] font-medium text-ink">{nama}</p>
                                        <p className="text-[12.5px] leading-[19px] text-muted">{karyawan?.jabatan}</p>
                                    </div>
                                    <div className="px-6 py-4">
                                        <p className="text-xs leading-[18px] text-muted">Informasi Waktu Pelaksanaan</p>
                                        <p className="flex items-center gap-1.5 pt-1 text-sm leading-[21px] font-medium text-ink">
                                            <Clock className="size-3.5 text-muted" /> {rentangJam(sesi)}
                                        </p>
                                        <p className="flex items-start gap-1.5 text-[12.5px] leading-[19px] text-muted">
                                            <MapPin className="mt-[3px] size-3 shrink-0" /> {sesi.lokasi}
                                        </p>
                                    </div>
                                    <div className="px-6 py-4">
                                        <p className="text-xs leading-[18px] text-muted">Informasi Tanggal Presensi</p>
                                        <p className="flex items-center gap-1.5 pt-1 text-sm leading-[21px] font-medium text-ink">
                                            <CalendarDays className="size-3.5 text-muted" /> {tgl(sesi.tanggal_pelatihan)}
                                        </p>
                                        <p className="text-[12.5px] leading-[19px] text-muted">Hari ini {hariIni()}</p>
                                    </div>
                                </div>

                                <div className="px-6 py-6">
                                    <p className="text-[13px] leading-5 font-medium text-ink">Status kehadiran</p>
                                    <div className={`mt-2 flex items-center gap-3 rounded-[10px] border px-4 py-3.5 ${tercatat ? 'border-ok/40 bg-ok-soft' : 'border-brand-bright bg-brand-soft'}`}>
                                        <span className={`flex size-5 items-center justify-center rounded-full border-[1.6px] ${tercatat ? 'border-ok' : 'border-brand'}`}>
                                            <span className={`size-2 rounded-full ${tercatat ? 'bg-ok' : 'bg-brand'}`} />
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium text-ink">{tercatat ? 'Hadir · presensi tercatat' : 'Hadir'}</p>
                                            <p className="text-[12.5px] text-muted">
                                                {tercatat ? 'Kehadiran Anda pada sesi ini sudah tersimpan.' : 'Tekan Hadir Sekarang untuk mencatat kehadiran Anda.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
                                    <Button icon={ArrowLeft} onClick={() => navigate('/jadwal')}>
                                        Kembali
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        icon={UserCheck}
                                        loading={aksi.sibuk}
                                        disabled={!dibuka || tercatat}
                                        onClick={() => aksi.jalankan(() => api(`/jadwal-pelatihan/${sesi.id}/presensi`, { method: 'POST' }), jadwal.reload)}
                                    >
                                        Hadir Sekarang
                                    </Button>
                                </div>
                            </section>

                            <aside className="rounded-xl border border-line bg-white">
                                <div className="border-b border-line px-5 py-4">
                                    <p className="text-sm leading-[21px] font-semibold text-ink">Sesi Anda</p>
                                    <p className="text-[12.5px] leading-[19px] text-muted">{hariIni()}</p>
                                </div>
                                <ul className="space-y-1 p-2">
                                    {data.map((s) => (
                                        <li key={s.id}>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/presensi/${s.id}`)}
                                                aria-current={s.id === sesi.id}
                                                className={`w-full rounded-lg px-3 py-3 text-left ${s.id === sesi.id ? 'bg-brand-soft' : 'hover:bg-surface'}`}
                                            >
                                                <span className="block text-[13px] leading-[19px] font-medium text-ink">{s.pelatihan?.nama_pelatihan}</span>
                                                <span className="mt-1 flex justify-between gap-2 text-xs leading-[18px]">
                                                    <span className="text-muted">{rentangJam(s)}</span>
                                                    <span className={s.sudah_presensi ? 'font-medium text-ok' : s.status_jadwal === 'dibuka' ? 'font-medium text-warn-ink' : 'text-muted'}>
                                                        {s.sudah_presensi ? 'Tercatat' : s.status_jadwal === 'dibuka' ? 'Belum presensi' : 'Belum dibuka'}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </aside>
                        </div>
                    </div>
                );
            }}
        </Muat>
    );
}

// ---- Rekomendasi pelatihan (PGN-SRS-08) ------------------------------------

export function Rekomendasi() {
    const rekomendasi = useApi('/rekomendasi-pelatihan');

    return (
        <>
            <Judul title="Rekomendasi Pelatihan">Pelatihan yang disarankan berdasarkan hasil skill assessment terakhir Anda.</Judul>
            <Muat sumber={rekomendasi} gagal="Gagal memuat rekomendasi">
                {(data, pesan) =>
                    data == null ? (
                        <Card>
                            <Empty title="Belum ada rekomendasi" action={<Button variant="primary" to="/assessment/isi">Isi Skill Assessment</Button>}>
                                {pesan}
                            </Empty>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {data.rekomendasi.length === 0 ? (
                                <Card>
                                    <Empty title="Tidak ada pelatihan yang perlu direkomendasikan">Seluruh kompetensi sudah tercapai atau pelatihannya belum tersedia.</Empty>
                                </Card>
                            ) : (
                                data.rekomendasi.map((item) => <KartuPelatihan key={item.id} item={item} status={[`Kompetensi: ${item.kompetensi}`, 'brand']} />)
                            )}

                            <div className="grid gap-6 md:grid-cols-2">
                                <Card title="Kompetensi sudah tercapai">
                                    <div className="flex flex-wrap gap-2">
                                        {data.kompetensi_tercover.length ? data.kompetensi_tercover.map((k) => <Badge key={k} tone="ok">{k}</Badge>) : <span className="text-[13.5px] text-muted">Belum ada.</span>}
                                    </div>
                                </Card>
                                <Card title="Kebutuhan belum tersedia" subtitle="Belum ada pelatihan untuk kompetensi ini; akan ditindaklanjuti HR/PSDM">
                                    <div className="flex flex-wrap gap-2">
                                        {data.kebutuhan_belum_tersedia.length ? data.kebutuhan_belum_tersedia.map((k) => <Badge key={k} tone="warn">{k}</Badge>) : <span className="text-[13.5px] text-muted">Tidak ada.</span>}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )
                }
            </Muat>
        </>
    );
}
