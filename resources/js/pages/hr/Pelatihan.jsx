import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, BackLink, Badge, Button, Card, Cell, Empty, Field, Input, Modal, Muat, PageHeader, Rincian, SearchInput, Segmented, Select, StatusBadge, Table, Tag, Textarea, Umpan, useAksi } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { JENIS_MATERI, JENIS_TUGAS, jam, rentangJam, tgl, tglPanjang } from '../../lib/format';

const KOMPETENSI = ['Komunikasi', 'Kerja Sama Tim', 'Pemecahan Masalah', 'Kepemimpinan', 'Penguasaan Teknis', 'Manajemen Waktu'];

/** Formulir generik di dalam modal: daftar field → body permintaan. */
function FormModal({ judul, awal, fields, onKirim, onClose, labelSimpan = 'Simpan' }) {
    const aksi = useAksi();
    const [nilai, setNilai] = useState(awal);

    const kirim = (event) => {
        event.preventDefault();
        aksi.jalankan(() => onKirim(nilai), onClose);
    };

    return (
        <Modal title={judul} onClose={() => onClose()}>
            <form onSubmit={kirim}>
                <Umpan aksi={aksi} />
                <div className="grid gap-4 sm:grid-cols-2">
                    {fields.map(({ name, label, type = 'text', options, full, required, hint, ...lain }) => {
                        const props = {
                            value: nilai[name] ?? '',
                            onChange: (e) => setNilai({ ...nilai, [name]: e.target.value }),
                            required,
                            ...lain,
                        };

                        return (
                            <Field key={name} label={label} required={required} hint={hint} error={aksi.galat?.errors?.[name]?.[0]} className={full ? 'sm:col-span-2' : ''}>
                                {type === 'select' ? (
                                    <Select {...props}>
                                        {options.map(([v, l]) => (
                                            <option key={v} value={v}>
                                                {l}
                                            </option>
                                        ))}
                                    </Select>
                                ) : type === 'textarea' ? (
                                    <Textarea {...props} />
                                ) : (
                                    <Input type={type} {...props} />
                                )}
                            </Field>
                        );
                    })}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <Button onClick={() => onClose()}>Batal</Button>
                    <Button type="submit" variant="primary" loading={aksi.sibuk}>
                        {labelSimpan}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

function Konfirmasi({ judul, children, label = 'Hapus', onYa, onClose }) {
    const aksi = useAksi();

    return (
        <Modal
            title={judul}
            onClose={() => onClose()}
            footer={
                <>
                    <Button onClick={() => onClose()}>Batal</Button>
                    <Button variant="danger" loading={aksi.sibuk} onClick={() => aksi.jalankan(onYa, onClose)}>
                        {label}
                    </Button>
                </>
            }
        >
            <Umpan aksi={aksi} />
            <p className="text-[13.5px] text-body">{children}</p>
        </Modal>
    );
}

export { FormModal, Konfirmasi };

const bersih = (objek) => Object.fromEntries(Object.entries(objek).map(([k, v]) => [k, v === '' ? null : v]));

const FIELD_PELATIHAN = [
    { name: 'nama_pelatihan', label: 'Nama Pelatihan', required: true, full: true },
    { name: 'jenis_pelatihan', label: 'Jenis Pelatihan', type: 'select', options: [['umum', 'Umum'], ['wajib', 'Wajib']] },
    { name: 'status_pelatihan', label: 'Status', type: 'select', options: [['aktif', 'Aktif'], ['rencana', 'Rencana'], ['selesai', 'Selesai']] },
    { name: 'jadwal', label: 'Jadwal Mulai', type: 'date', required: true },
    { name: 'kuota', label: 'Kuota Peserta', type: 'number', min: 1, required: true },
    { name: 'kompetensi', label: 'Kompetensi', type: 'select', options: [['', 'Tidak ditentukan'], ...KOMPETENSI.map((k) => [k, k])], hint: 'Dasar rekomendasi pelatihan' },
    { name: 'passing_grade', label: 'Passing Grade', type: 'number', min: 0, max: 100, hint: 'Kosongkan untuk nilai bawaan (70)' },
    { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', full: true },
];

// ---- UC-15 / UC-21 Kelola pelatihan ----------------------------------------

/** Judul halaman gaya frame UI-15/16: judul 26px dan satu baris keterangan. */
function Judul({ title, children }) {
    return (
        <div className="mb-6">
            <h1 className="text-[26px] leading-[1.45] font-semibold text-ink">{title}</h1>
            <p className="mt-[5px] text-[14.5px] leading-[1.45] text-muted">{children}</p>
        </div>
    );
}

const TAG_STATUS_PELATIHAN = { aktif: ['Aktif', 'ok'], rencana: ['Draft', 'neutral'], selesai: ['Selesai', 'neutral'] };

const jadwalPelatihan = (p) => {
    const sesi = p.jadwal_pelatihan?.[0];

    return sesi ? [tgl(sesi.tanggal_pelatihan), rentangJam(sesi)] : [tgl(p.jadwal), 'Sesi belum dibuat'];
};

export function KelolaPelatihan() {
    const [saring, setSaring] = useState({ q: '', status: '' });
    const pelatihan = useApi('/hr/pelatihan', saring);
    const [hapus, setHapus] = useState(null);
    const [pesan, setPesan] = useState(useLocation().state?.pesan ?? null);

    return (
        <>
            <Judul title="Kelola Pelatihan">Lihat dan kelola pelatihan beserta sesi, materi, soal tes, dan pesertanya.</Judul>
            {pesan && <Alert tone="ok" title={pesan} onClose={() => setPesan(null)} className="mb-6" />}

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <SearchInput className="w-full max-w-[320px]" placeholder="Cari nama pelatihan" aria-label="Cari nama pelatihan" value={saring.q} onChange={(e) => setSaring({ ...saring, q: e.target.value })} />
                <Select className="w-[180px]" aria-label="Filter status" value={saring.status} onChange={(e) => setSaring({ ...saring, status: e.target.value })}>
                    <option value="">Semua status</option>
                    <option value="aktif">Aktif</option>
                    <option value="rencana">Draft</option>
                    <option value="selesai">Selesai</option>
                </Select>
                <span className="text-sm text-muted">{pelatihan.data ? `${pelatihan.data.length} pelatihan` : ''}</span>
                <Button variant="primary" className="ml-auto" to="/hr/pelatihan/baru">
                    Tambah Pelatihan
                </Button>
            </div>

            <section className="rounded-xl border border-line bg-white p-6">
                <Muat sumber={pelatihan} gagal="Gagal memuat data pelatihan">
                    {(data, pesanKosong) =>
                        data.length === 0 ? (
                            <Empty title={pesanKosong ?? 'Belum ada pelatihan'} />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left">
                                    <thead>
                                        <tr className="bg-surface text-xs text-muted [&>th]:py-[11px] [&>th]:font-normal">
                                            <th>Pelatihan</th>
                                            <th className="w-[86px]">Jenis</th>
                                            <th className="w-[186px]">Jadwal</th>
                                            <th className="w-[91px]">Peserta</th>
                                            <th className="w-[106px]">Status</th>
                                            <th className="w-[300px]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((p) => {
                                            const [tanggal, waktu] = jadwalPelatihan(p);
                                            const [label, nada] = TAG_STATUS_PELATIHAN[p.status_pelatihan] ?? [p.status_pelatihan, 'neutral'];

                                            return (
                                                <tr key={p.id} className="h-[71px] border-b border-line text-sm text-ink last:border-b-0">
                                                    <td className="pr-4">
                                                        <Link to={`/hr/pelatihan/${p.id}`} className="font-medium hover:text-brand hover:underline">
                                                            {p.nama_pelatihan}
                                                        </Link>
                                                        <p className="mt-1 text-xs text-muted">{p.kompetensi ?? 'Sesi, materi, dan soal tes'}</p>
                                                    </td>
                                                    <td>{p.jenis_pelatihan === 'wajib' ? 'Wajib' : 'Umum'}</td>
                                                    <td>
                                                        {tanggal}
                                                        <p className="text-[13px] text-muted">{waktu}</p>
                                                    </td>
                                                    <td>
                                                        {p.peserta_count}/{p.kuota}
                                                    </td>
                                                    <td>
                                                        <Tag tone={nada}>{label}</Tag>
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-2">
                                                            <Button to={`/hr/pelatihan/${p.id}/edit`}>Edit</Button>
                                                            <Button variant="danger" onClick={() => setHapus(p)}>
                                                                Hapus
                                                            </Button>
                                                            <Button to={`/hr/pelatihan/${p.id}/peserta`}>Kelola Peserta</Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    }
                </Muat>
            </section>

            {hapus && (
                <Konfirmasi
                    judul="Konfirmasi hapus pelatihan"
                    onClose={(hasil) => {
                        setHapus(null);

                        if (hasil) {
                            setPesan(hasil.message);
                            pelatihan.reload();
                        }
                    }}
                    onYa={() => api(`/hr/pelatihan/${hapus.id}`, { method: 'DELETE' })}
                >
                    Pelatihan <strong>{hapus.nama_pelatihan}</strong> beserta sesi, materi, soal, dan data pesertanya akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </Konfirmasi>
            )}
        </>
    );
}

// ---- Formulir tambah / edit pelatihan (frame UI-15 Form) --------------------

function IsiForm({ awal, id }) {
    const navigate = useNavigate();
    const aksi = useAksi();
    const [nilai, setNilai] = useState(awal);
    const galat = (nama) => aksi.galat?.errors?.[nama]?.[0];
    const ubah = (nama) => (e) => setNilai({ ...nilai, [nama]: e.target.value });

    const kirim = (event) => {
        event.preventDefault();
        const body = bersih(Object.fromEntries(FIELD_PELATIHAN.map((f) => [f.name, nilai[f.name] ?? ''])));

        aksi.jalankan(
            () => api(id ? `/hr/pelatihan/${id}` : '/hr/pelatihan', { method: id ? 'PUT' : 'POST', body }),
            (hasil) => navigate('/hr/pelatihan', { state: { pesan: hasil.message } }),
        );
    };

    const kelas = 'h-[46px]';

    return (
        <form onSubmit={kirim} className="rounded-xl border border-line bg-white p-6">
            <Umpan aksi={aksi} />
            <div className="grid gap-x-6 gap-y-[22px] sm:grid-cols-2">
                <Field label="Nama Pelatihan" required error={galat('nama_pelatihan')} className="sm:col-span-2">
                    <Input className={kelas} value={nilai.nama_pelatihan ?? ''} onChange={ubah('nama_pelatihan')} required />
                </Field>
                <Field label="Jenis Pelatihan" error={galat('jenis_pelatihan')}>
                    <Select className={kelas} value={nilai.jenis_pelatihan ?? 'umum'} onChange={ubah('jenis_pelatihan')}>
                        <option value="umum">Umum</option>
                        <option value="wajib">Wajib</option>
                    </Select>
                </Field>
                <Field label="Status" error={galat('status_pelatihan')}>
                    <Select className={kelas} value={nilai.status_pelatihan ?? 'aktif'} onChange={ubah('status_pelatihan')}>
                        <option value="aktif">Aktif</option>
                        <option value="rencana">Draft</option>
                        <option value="selesai">Selesai</option>
                    </Select>
                </Field>
                <Field label="Jadwal Mulai" required error={galat('jadwal')}>
                    <Input className={kelas} type="date" value={nilai.jadwal ?? ''} onChange={ubah('jadwal')} required />
                </Field>
                <Field label="Kuota Peserta" required error={galat('kuota')}>
                    <Input className={kelas} type="number" min={1} value={nilai.kuota ?? ''} onChange={ubah('kuota')} required />
                </Field>
                <Field label="Kompetensi" hint="Dasar rekomendasi pelatihan dari hasil skill assessment" error={galat('kompetensi')}>
                    <Select className={kelas} value={nilai.kompetensi ?? ''} onChange={ubah('kompetensi')}>
                        <option value="">Tidak ditentukan</option>
                        {KOMPETENSI.map((k) => (
                            <option key={k} value={k}>
                                {k}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Passing Grade" hint="Kosongkan untuk nilai bawaan (70)" error={galat('passing_grade')}>
                    <Input className={kelas} type="number" min={0} max={100} value={nilai.passing_grade ?? ''} onChange={ubah('passing_grade')} />
                </Field>
                <Field label="Deskripsi" error={galat('deskripsi')} className="sm:col-span-2">
                    <Textarea value={nilai.deskripsi ?? ''} onChange={ubah('deskripsi')} />
                </Field>
            </div>
            <div className="mt-6 flex gap-3">
                <Button to="/hr/pelatihan">Batal</Button>
                <Button type="submit" variant="primary" loading={aksi.sibuk}>
                    Simpan Pelatihan
                </Button>
            </div>
        </form>
    );
}

export function FormPelatihan() {
    const { id } = useParams();
    const detail = useApi(id ? `/hr/pelatihan/${id}` : null);

    return (
        <>
            <BackLink to="/hr/pelatihan">Kembali ke Kelola Pelatihan</BackLink>
            <Judul title={id ? 'Edit Pelatihan' : 'Tambah Pelatihan'}>Lengkapi informasi pelatihan. Sesi, materi, dan soal tes ditambahkan setelah pelatihan disimpan.</Judul>
            {id ? <Muat sumber={detail} gagal="Gagal memuat pelatihan">{(p) => <IsiForm awal={p} id={id} />}</Muat> : <IsiForm awal={{ jenis_pelatihan: 'umum', status_pelatihan: 'aktif' }} />}
        </>
    );
}

// ---- UC-16 Kelola peserta pelatihan -----------------------------------------

function BarisPilih({ dipilih, onUbah, nonaktif, judul, sub }) {
    return (
        <li className="border-b border-line">
            <label className={`flex items-start gap-3 py-[15px] ${nonaktif ? 'opacity-55' : ''}`}>
                <input type="checkbox" className="mt-1 size-4 accent-brand" checked={dipilih} disabled={nonaktif} onChange={(e) => onUbah(e.target.checked)} />
                <span>
                    <span className="block text-sm leading-5 font-medium text-ink">{judul}</span>
                    <span className="mt-[3px] block text-xs leading-[17px] text-muted">{sub}</span>
                </span>
            </label>
        </li>
    );
}

export function KelolaPeserta() {
    const { id } = useParams();
    const navigate = useNavigate();
    const semua = useApi('/hr/pelatihan');
    const detail = useApi(`/hr/pelatihan/${id}`);
    const peserta = useApi(`/hr/pelatihan/${id}/peserta`);
    const karyawan = useApi('/hr/karyawan');
    const aksi = useAksi();
    const [pilihMasuk, setPilihMasuk] = useState([]);
    const [pilihKeluar, setPilihKeluar] = useState([]);
    const [konfirmasi, setKonfirmasi] = useState(null);

    useEffect(() => {
        setPilihMasuk([]);
        setPilihKeluar([]);
        aksi.reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const daftarPeserta = peserta.data ?? [];
    const idPeserta = new Set(daftarPeserta.map((p) => p.karyawan_id));
    const calon = (karyawan.data ?? []).filter((k) => !idPeserta.has(k.id));
    const ganti = (daftar, set, nilai, pilih) => set(pilih ? [...daftar, nilai] : daftar.filter((x) => x !== nilai));

    const segarkan = () => {
        setPilihMasuk([]);
        setPilihKeluar([]);
        setKonfirmasi(null);
        peserta.reload();
        detail.reload();
    };

    const assign = () => aksi.jalankan(() => api(`/hr/pelatihan/${id}/peserta`, { method: 'POST', body: { karyawan_ids: pilihMasuk } }), segarkan);

    const unassign = () =>
        aksi.jalankan(async () => {
            for (const karyawanId of pilihKeluar) {
                await api(`/hr/pelatihan/${id}/peserta/${karyawanId}`, { method: 'DELETE' });
            }

            return { message: `${pilihKeluar.length} peserta berhasil dikeluarkan dari pelatihan` };
        }, segarkan);

    return (
        <>
            <BackLink to="/hr/pelatihan">Kembali ke Kelola Pelatihan</BackLink>
            <Judul title="Kelola Peserta Pelatihan">Tetapkan atau batalkan kepesertaan karyawan pada pelatihan yang dipilih.</Judul>

            <Field label="Pilih Pelatihan" className="mb-6">
                <Select className="h-[46px]" value={id} onChange={(e) => navigate(`/hr/pelatihan/${e.target.value}/peserta`)}>
                    {(semua.data ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.nama_pelatihan}
                        </option>
                    ))}
                </Select>
            </Field>

            <Umpan aksi={aksi} className="mb-6" />

            <Muat sumber={detail} gagal="Gagal memuat pelatihan">
                {(p) => {
                    const [label, nada] = TAG_STATUS_PELATIHAN[p.status_pelatihan] ?? [p.status_pelatihan, 'neutral'];

                    return (
                        <>
                            <section className="mb-6 rounded-xl border border-line bg-white p-6">
                                <h2 className="text-lg leading-[1.45] font-semibold text-ink">{p.nama_pelatihan}</h2>
                                <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-4">
                                    {[
                                        ['Jenis', p.jenis_pelatihan === 'wajib' ? 'Wajib' : 'Umum'],
                                        ['Jadwal', tglPanjang(p.jadwal)],
                                        ['Peserta / Kuota', `${p.peserta_count} / ${p.kuota}`],
                                    ].map(([nama, nilai]) => (
                                        <div key={nama} className="w-[250px]">
                                            <p className="text-[12.5px] leading-[18px] text-muted">{nama}</p>
                                            <p className="mt-[5px] text-lg leading-[26px] font-semibold text-ink">{nilai}</p>
                                        </div>
                                    ))}
                                    <Tag tone={nada}>{label}</Tag>
                                </div>
                            </section>

                            <div className="grid items-start gap-6 lg:grid-cols-2">
                                <section className="rounded-xl border border-line bg-white p-[21px]">
                                    <h2 className="border-b border-line pb-3.5 text-[17px] leading-[25px] font-semibold text-ink">Daftar Karyawan</h2>
                                    <ul className="max-h-[420px] overflow-y-auto">
                                        {calon.length === 0 && <li className="border-b border-line py-6 text-center text-sm text-muted">Seluruh karyawan sudah menjadi peserta.</li>}
                                        {calon.map((k) => (
                                            <BarisPilih
                                                key={k.id}
                                                judul={k.nama_karyawan}
                                                sub={`${k.jabatan} · ${k.status_karyawan === 'aktif' ? 'Aktif · Belum terdaftar' : 'Tidak aktif'}`}
                                                nonaktif={k.status_karyawan !== 'aktif'}
                                                dipilih={pilihMasuk.includes(k.id)}
                                                onUbah={(pilih) => ganti(pilihMasuk, setPilihMasuk, k.id, pilih)}
                                            />
                                        ))}
                                    </ul>
                                    <Button variant="primary" className="mt-[15px]" disabled={!pilihMasuk.length} loading={aksi.sibuk && !konfirmasi} onClick={() => setKonfirmasi('assign')}>
                                        Assign Karyawan
                                    </Button>
                                </section>

                                <section className="rounded-xl border border-line bg-white p-[21px]">
                                    <h2 className="border-b border-line pb-3.5 text-[17px] leading-[25px] font-semibold text-ink">Peserta Pelatihan</h2>
                                    <ul className="max-h-[420px] overflow-y-auto">
                                        {daftarPeserta.length === 0 && <li className="border-b border-line py-6 text-center text-sm text-muted">Belum ada peserta pada pelatihan ini.</li>}
                                        {daftarPeserta.map((ps) => (
                                            <BarisPilih
                                                key={ps.id}
                                                judul={ps.karyawan?.nama_karyawan}
                                                sub={`${ps.karyawan?.jabatan ?? ''} · ${ps.status_peserta === 'selesai' ? 'Selesai' : 'Terdaftar'} · ${ps.sumber_pendaftaran === 'hr' ? 'ditetapkan HR' : 'pengajuan mandiri'}`}
                                                dipilih={pilihKeluar.includes(ps.karyawan_id)}
                                                onUbah={(pilih) => ganti(pilihKeluar, setPilihKeluar, ps.karyawan_id, pilih)}
                                            />
                                        ))}
                                    </ul>
                                    <Button className="mt-[15px]" disabled={!pilihKeluar.length} onClick={() => setKonfirmasi('unassign')}>
                                        Unassign Peserta
                                    </Button>
                                    <p className="mt-3 text-xs text-muted">
                                        Menampilkan {daftarPeserta.length} dari {p.kuota} kuota peserta
                                    </p>
                                </section>
                            </div>
                        </>
                    );
                }}
            </Muat>

            {konfirmasi && (
                <Modal
                    title={konfirmasi === 'assign' ? 'Konfirmasi assign' : 'Konfirmasi unassign'}
                    onClose={() => setKonfirmasi(null)}
                    footer={
                        <>
                            <Button onClick={() => setKonfirmasi(null)}>Batal</Button>
                            <Button variant={konfirmasi === 'assign' ? 'primary' : 'danger'} loading={aksi.sibuk} onClick={konfirmasi === 'assign' ? assign : unassign}>
                                {konfirmasi === 'assign' ? 'Assign Karyawan' : 'Unassign Peserta'}
                            </Button>
                        </>
                    }
                >
                    <p className="text-[13.5px] text-body">
                        {konfirmasi === 'assign'
                            ? `${pilihMasuk.length} karyawan akan ditetapkan sebagai peserta dan menerima notifikasi.`
                            : `${pilihKeluar.length} peserta akan dikeluarkan beserta tugas yang belum dikerjakan.`}
                    </p>
                </Modal>
            )}
        </>
    );
}

// ---- Detail kelola: sesi, materi, soal, peserta (UC-15, UC-16) -------------

const FIELD_SESI = [
    { name: 'tanggal_pelatihan', label: 'Tanggal', type: 'date', required: true },
    { name: 'status_jadwal', label: 'Status Sesi', type: 'select', options: [['terjadwal', 'Terjadwal'], ['dibuka', 'Presensi dibuka'], ['ditutup', 'Ditutup'], ['selesai', 'Selesai']] },
    { name: 'waktu_mulai', label: 'Waktu Mulai', type: 'time', required: true },
    { name: 'waktu_selesai', label: 'Waktu Selesai', type: 'time', required: true },
    { name: 'lokasi', label: 'Lokasi / Tautan', required: true, full: true },
];

const FIELD_MATERI = [
    { name: 'judul_materi', label: 'Judul Materi', required: true, full: true },
    { name: 'jenis_materi', label: 'Jenis', type: 'select', options: Object.entries(JENIS_MATERI) },
    { name: 'status_publikasi', label: 'Publikasi', type: 'select', options: [['terbit', 'Terbit'], ['draft', 'Draf']] },
    { name: 'lokasi_materi', label: 'Lokasi / URL Materi', required: true, full: true },
    { name: 'urutan', label: 'Urutan', type: 'number', min: 1 },
];

const FIELD_SOAL = [
    { name: 'jenis_tes', label: 'Jenis Tes', type: 'select', options: [['pre_test', 'Pre-Test'], ['post_test', 'Post-Test']] },
    { name: 'jawaban_benar', label: 'Jawaban Benar', type: 'select', options: ['A', 'B', 'C', 'D'].map((k) => [k, k]) },
    { name: 'pertanyaan', label: 'Pertanyaan', type: 'textarea', required: true, full: true },
    { name: 'A', label: 'Pilihan A', required: true },
    { name: 'B', label: 'Pilihan B', required: true },
    { name: 'C', label: 'Pilihan C' },
    { name: 'D', label: 'Pilihan D' },
];

export function DetailKelola() {
    const { id } = useParams();
    const detail = useApi(`/hr/pelatihan/${id}`);
    const soal = useApi(`/hr/pelatihan/${id}/soal`);
    const presensi = useApi(`/hr/pelatihan/${id}/presensi`);
    const [tab, setTab] = useState('sesi');
    const [form, setForm] = useState(null);
    const [hapus, setHapus] = useState(null);
    const [pesan, setPesan] = useState(null);

    const tutup = (hasil) => {
        setForm(null);
        setHapus(null);

        if (hasil) {
            setPesan(hasil.message);
            detail.reload();
            soal.reload();
            presensi.reload();
        }
    };

    const hadir = (sesiId) => presensi.data?.sesi?.find((s) => s.id === sesiId)?.presensi?.length ?? 0;

    return (
        <Muat sumber={detail} gagal="Gagal memuat pelatihan">
            {(p) => (
                <>
                    <PageHeader back={{ to: '/hr/pelatihan', label: 'Kembali ke Kelola Pelatihan' }} title={p.nama_pelatihan} description={p.deskripsi} />
                    {pesan && <Alert tone="ok" title={pesan} onClose={() => setPesan(null)} className="mb-5" />}

                    <Card className="mb-5">
                        <Rincian
                            items={[
                                ['Jenis', <StatusBadge key="j" value={p.jenis_pelatihan} dot={false} />],
                                ['Jadwal mulai', tgl(p.jadwal)],
                                ['Peserta / Kuota', `${p.peserta_count} / ${p.kuota}`],
                                ['Status', <StatusBadge key="s" value={p.status_pelatihan} />],
                            ]}
                        />
                    </Card>

                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <Segmented
                            value={tab}
                            onChange={setTab}
                            options={[
                                ['sesi', 'Sesi', p.jadwal_pelatihan.length],
                                ['materi', 'Materi', p.materi.length],
                                ['soal', 'Soal Tes', p.soal_count],
                            ]}
                        />
                        <Button to={`/hr/pelatihan/${p.id}/peserta`}>Kelola Peserta ({p.peserta_count})</Button>
                    </div>

                    {tab === 'sesi' && (
                        <Card
                            title="Daftar Sesi Pelatihan"
                            subtitle="Ubah status menjadi “Presensi dibuka” agar peserta dapat mengisi presensi"
                            flush
                            action={
                                <Button size="sm" variant="primary" icon={Plus} onClick={() => setForm({ jenis: 'sesi', awal: { status_jadwal: 'terjadwal', tanggal_pelatihan: p.jadwal } })}>
                                    Tambah Sesi
                                </Button>
                            }
                        >
                            <Table
                                rows={p.jadwal_pelatihan}
                                empty="Belum ada sesi pelatihan"
                                columns={[
                                    { label: 'Tanggal', render: (s) => tgl(s.tanggal_pelatihan) },
                                    { label: 'Waktu', render: (s) => `${jam(s.waktu_mulai)}–${jam(s.waktu_selesai)}` },
                                    { label: 'Lokasi', render: (s) => s.lokasi },
                                    { label: 'Hadir', render: (s) => `${hadir(s.id)} / ${p.peserta_count}` },
                                    { label: 'Status', render: (s) => <StatusBadge value={s.status_jadwal} /> },
                                    {
                                        label: 'Aksi',
                                        right: true,
                                        render: (s) => (
                                            <div className="flex justify-end gap-1.5">
                                                <Button size="sm" onClick={() => setForm({ jenis: 'sesi', awal: { ...s, waktu_mulai: jam(s.waktu_mulai), waktu_selesai: jam(s.waktu_selesai) } })}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => setHapus({ url: `/hr/jadwal/${s.id}`, nama: `sesi ${tgl(s.tanggal_pelatihan)}` })}>
                                                    Hapus
                                                </Button>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    )}


                    {tab === 'materi' && (
                        <Card
                            title="Materi Pelatihan"
                            subtitle="Jenis latihan soal dan sesi Zoom ditampilkan sebagai materi perbaikan bagi peserta yang belum lulus"
                            flush
                            action={
                                <Button size="sm" variant="primary" icon={Plus} onClick={() => setForm({ jenis: 'materi', awal: { jenis_materi: 'dokumen', status_publikasi: 'terbit', urutan: p.materi.length + 1 } })}>
                                    Tambah Materi
                                </Button>
                            }
                        >
                            <Table
                                rows={p.materi}
                                empty="Belum ada materi"
                                columns={[
                                    { label: 'Urutan', render: (m) => m.urutan },
                                    { label: 'Judul materi', render: (m) => <Cell title={m.judul_materi} sub={m.lokasi_materi} /> },
                                    { label: 'Jenis', render: (m) => JENIS_MATERI[m.jenis_materi] },
                                    { label: 'Publikasi', render: (m) => <StatusBadge value={m.status_publikasi} /> },
                                    {
                                        label: 'Aksi',
                                        right: true,
                                        render: (m) => (
                                            <div className="flex justify-end gap-1.5">
                                                <Button size="sm" onClick={() => setForm({ jenis: 'materi', awal: m })}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => setHapus({ url: `/hr/materi/${m.id}`, nama: `materi ${m.judul_materi}` })}>
                                                    Hapus
                                                </Button>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </Card>
                    )}

                    {tab === 'soal' && (
                        <Card
                            title="Soal Pre-Test dan Post-Test"
                            subtitle="Soal pilihan ganda untuk evaluasi pelatihan"
                            flush
                            action={
                                <Button size="sm" variant="primary" icon={Plus} onClick={() => setForm({ jenis: 'soal', awal: { jenis_tes: 'post_test', jawaban_benar: 'A' } })}>
                                    Tambah Soal
                                </Button>
                            }
                        >
                            <Muat sumber={soal} gagal="Gagal memuat soal">
                                {(data) => (
                                    <Table
                                        rows={data}
                                        empty="Belum ada soal tes"
                                        columns={[
                                            { label: 'Jenis', render: (s) => <Badge dot={false}>{JENIS_TUGAS[s.jenis_tes]}</Badge> },
                                            {
                                                label: 'Pertanyaan',
                                                render: (s) => (
                                                    <Cell
                                                        title={s.pertanyaan}
                                                        sub={Object.entries(s.pilihan)
                                                            .map(([k, v]) => `${k}. ${v}`)
                                                            .join('  ·  ')}
                                                    />
                                                ),
                                            },
                                            { label: 'Kunci', render: (s) => <span className="font-semibold">{s.jawaban_benar}</span> },
                                            {
                                                label: '',
                                                right: true,
                                                render: (s) => (
                                                    <Button size="sm" variant="danger" icon={Trash2} aria-label="Hapus soal" onClick={() => setHapus({ url: `/hr/soal/${s.id}`, nama: 'soal ini' })} />
                                                ),
                                            },
                                        ]}
                                    />
                                )}
                            </Muat>
                        </Card>
                    )}

                    {form?.jenis === 'sesi' && (
                        <FormModal
                            judul={form.awal.id ? 'Edit Sesi Pelatihan' : 'Tambah Sesi Pelatihan'}
                            labelSimpan="Simpan Sesi"
                            awal={form.awal}
                            fields={FIELD_SESI}
                            onClose={tutup}
                            onKirim={(nilai) => {
                                const body = Object.fromEntries(FIELD_SESI.map((f) => [f.name, nilai[f.name]]));

                                return api(form.awal.id ? `/hr/jadwal/${form.awal.id}` : `/hr/pelatihan/${id}/jadwal`, { method: form.awal.id ? 'PUT' : 'POST', body });
                            }}
                        />
                    )}
                    {form?.jenis === 'materi' && (
                        <FormModal
                            judul={form.awal.id ? 'Edit Materi' : 'Tambah Materi'}
                            awal={form.awal}
                            fields={FIELD_MATERI}
                            onClose={tutup}
                            onKirim={(nilai) => {
                                const body = Object.fromEntries(FIELD_MATERI.map((f) => [f.name, nilai[f.name]]));

                                return api(form.awal.id ? `/hr/materi/${form.awal.id}` : `/hr/pelatihan/${id}/materi`, { method: form.awal.id ? 'PUT' : 'POST', body });
                            }}
                        />
                    )}
                    {form?.jenis === 'soal' && (
                        <FormModal
                            judul="Tambah Soal"
                            awal={form.awal}
                            fields={FIELD_SOAL}
                            onClose={tutup}
                            onKirim={(nilai) =>
                                api(`/hr/pelatihan/${id}/soal`, {
                                    method: 'POST',
                                    body: {
                                        jenis_tes: nilai.jenis_tes,
                                        pertanyaan: nilai.pertanyaan,
                                        jawaban_benar: nilai.jawaban_benar,
                                        pilihan: Object.fromEntries(['A', 'B', 'C', 'D'].filter((k) => nilai[k]).map((k) => [k, nilai[k]])),
                                    },
                                })
                            }
                        />
                    )}
                    {hapus && (
                        <Konfirmasi judul="Konfirmasi hapus" onClose={tutup} onYa={() => api(hapus.url, { method: 'DELETE' })}>
                            Hapus {hapus.nama}? Tindakan ini tidak dapat dibatalkan.
                        </Konfirmasi>
                    )}
                </>
            )}
        </Muat>
    );
}
