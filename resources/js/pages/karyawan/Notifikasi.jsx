import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CalendarDays, CheckCheck, ClipboardCheck, FileText } from 'lucide-react';
import { Alert, Badge, Button, Empty, Muat, PageHeader, Tabs } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { tglWaktu } from '../../lib/format';

/** Kategori dan ikon notifikasi, ditentukan dari judulnya. */
const kategori = (judul = '') => {
    const teks = judul.toLowerCase();

    if (teks.includes('jadwal')) return ['Jadwal', CalendarDays];
    if (teks.includes('assessment')) return ['Assessment', ClipboardCheck];
    if (teks.includes('pengajuan') || teks.includes('pendaftaran') || teks.includes('peserta')) return ['Pengajuan', FileText];

    return ['Pelatihan', Bell];
};

/** UC-03 Menerima Notifikasi Pelatihan. */
export default function Notifikasi() {
    const notifikasi = useApi('/notifikasi');
    const { muatUlangNotifikasi } = useOutletContext();
    const [tab, setTab] = useState('semua');
    const [terbuka, setTerbuka] = useState(null);

    const baca = async (ids) => {
        await Promise.all(ids.map((id) => api(`/notifikasi/${id}/baca`, { method: 'POST' })));
        notifikasi.reload();
        muatUlangNotifikasi();
    };

    // "Lihat" membuka isi lengkap dan menandai notifikasi sudah dibaca.
    const lihat = (item) => {
        setTerbuka(terbuka === item.id ? null : item.id);
        if (!item.status_baca) baca([item.id]);
    };

    return (
        <Muat sumber={notifikasi} gagal="Gagal memuat notifikasi">
            {(data, pesan) => {
                const baru = data.filter((item) => !item.status_baca);
                const tampil = tab === 'baru' ? baru : data;

                return (
                    <>
                        <PageHeader
                            title="Notifikasi"
                            description="Informasi terbaru terkait jadwal, tugas, assessment, dan pengelolaan pelatihan."
                            action={
                                <Button icon={CheckCheck} disabled={!baru.length} onClick={() => baca(baru.map((item) => item.id))}>
                                    Tandai semua dibaca
                                </Button>
                            }
                        />

                        {baru.length > 0 && (
                            <Alert title={`${baru.length} notifikasi baru`} className="mb-5 rounded-xl">
                                Anda memiliki {baru.length} notifikasi yang belum dibaca. Pilih Lihat untuk membuka detailnya.
                            </Alert>
                        )}

                        <section className="overflow-hidden rounded-xl border border-line bg-white">
                            <div className="px-5 pt-4">
                                <Tabs
                                    value={tab}
                                    onChange={setTab}
                                    options={[
                                        ['semua', 'Semua', data.length],
                                        ['baru', 'Belum dibaca', baru.length],
                                    ]}
                                />
                            </div>

                            {tampil.length === 0 ? (
                                <Empty title={data.length ? 'Tidak ada notifikasi yang belum dibaca' : (pesan ?? 'Belum ada notifikasi')} />
                            ) : (
                                <ul>
                                    {tampil.map((item) => {
                                        const [label, Ikon] = kategori(item.judul_notifikasi);
                                        const belum = !item.status_baca;
                                        const buka = terbuka === item.id;

                                        return (
                                            <li
                                                key={item.id}
                                                className={`relative flex items-center gap-3 border-b border-line/70 px-5 py-4 last:border-b-0 ${belum ? 'bg-[#fffaf6]' : ''}`}
                                            >
                                                {belum && <span className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-brand-bright" />}
                                                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${belum ? 'bg-brand-soft text-brand' : 'bg-chip text-muted'}`}>
                                                    <Ikon className="size-[18px]" strokeWidth={1.75} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-sm leading-[21px] ${belum ? 'font-semibold text-ink' : 'font-medium text-body'}`}>{item.judul_notifikasi}</p>
                                                    <p className={`pt-0.5 text-[13px] leading-[19.5px] text-muted ${buka ? '' : 'truncate'}`}>{item.isi_notifikasi}</p>
                                                    <p className="pt-1 text-xs leading-[18px] text-faint">
                                                        {label} · {tglWaktu(item.tanggal_kirim)}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3">
                                                    <Badge tone={belum ? 'brand' : 'neutral'}>{belum ? 'Baru' : 'Dibaca'}</Badge>
                                                    <Button size="sm" aria-expanded={buka} onClick={() => lihat(item)}>
                                                        {buka ? 'Tutup' : 'Lihat'}
                                                    </Button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    </>
                );
            }}
        </Muat>
    );
}
