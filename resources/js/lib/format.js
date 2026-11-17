const tanggalPendek = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const tanggalPanjang = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const jamMenit = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

const keTanggal = (nilai) => {
    if (!nilai) return null;
    // Tanggal tanpa jam ("2026-11-23") dibaca sebagai waktu lokal, bukan UTC.
    const tanggal = new Date(/^\d{4}-\d{2}-\d{2}$/.test(nilai) ? `${nilai}T00:00:00` : nilai);

    return Number.isNaN(tanggal.getTime()) ? null : tanggal;
};

export const tgl = (nilai) => {
    const tanggal = keTanggal(nilai);

    return tanggal ? tanggalPendek.format(tanggal) : '—';
};

export const tglWaktu = (nilai) => {
    const tanggal = keTanggal(nilai);

    return tanggal ? `${tanggalPendek.format(tanggal)}, ${jamMenit.format(tanggal)}` : '—';
};

export const hariIni = () => tanggalPanjang.format(new Date());

const tanggalLengkap = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** Tanggal dengan nama bulan penuh, mis. "3 November 2026". */
export const tglPanjang = (nilai) => {
    const tanggal = keTanggal(nilai);

    return tanggal ? tanggalLengkap.format(tanggal) : '—';
};

/** Rentang waktu sesi, mis. "09.00–12.00". */
export const rentangJam = (sesi) => `${jam(sesi.waktu_mulai).replace(':', '.')}–${jam(sesi.waktu_selesai).replace(':', '.')}`;

export const jam = (nilai) => (nilai ? String(nilai).slice(0, 5) : '—');

export const angka = (nilai) =>
    nilai == null ? '—' : Number(nilai).toLocaleString('id-ID', { maximumFractionDigits: 1 });

export const inisial = (nama = '') =>
    nama
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((kata) => kata[0].toUpperCase())
        .join('') || '?';

/** Selisih hari dari hari ini; negatif berarti sudah lewat. */
export const sisaHari = (nilai) => {
    const tanggal = keTanggal(nilai);
    if (!tanggal) return null;

    return Math.ceil((tanggal.getTime() - Date.now()) / 86_400_000);
};

/** Label dan warna badge untuk setiap nilai status dari API. */
const STATUS = {
    aktif: ['Aktif', 'ok'],
    nonaktif: ['Nonaktif', 'neutral'],
    rencana: ['Rencana', 'neutral'],
    selesai: ['Selesai', 'ok'],
    terdaftar: ['Terdaftar', 'ok'],
    diajukan: ['Menunggu persetujuan', 'warn'],
    ditolak: ['Ditolak', 'bad'],
    belum_dikerjakan: ['Belum Dikerjakan', 'warn'],
    on_progress: ['Berjalan', 'brand'],
    lulus: ['Lulus', 'ok'],
    tidak_lulus: ['Tidak Lulus', 'bad'],
    terjadwal: ['Terjadwal', 'neutral'],
    dibuka: ['Presensi dibuka', 'ok'],
    tercatat: ['Tercatat', 'ok'],
    ditutup: ['Ditutup', 'neutral'],
    belum_dimulai: ['Belum Dimulai', 'neutral'],
    berjalan: ['Berjalan', 'brand'],
    tercapai: ['Tercapai', 'ok'],
    draft: ['Draf', 'neutral'],
    terbit: ['Terbit', 'ok'],
    wajib: ['Wajib', 'brand'],
    umum: ['Umum', 'neutral'],
    mandiri: ['Mandiri', 'info'],
    hr: ['Ditetapkan HR', 'neutral'],
    Tercapai: ['Tercapai', 'ok'],
    'Belum tercapai': ['Belum tercapai', 'warn'],
    'Memenuhi KPI': ['Memenuhi KPI', 'ok'],
    'Belum memenuhi KPI': ['Belum memenuhi KPI', 'bad'],
};

export const status = (nilai) => STATUS[nilai] ?? [nilai ?? '—', 'neutral'];

export const JENIS_TUGAS = {
    pre_test: 'Pre-Test',
    post_test: 'Post-Test',
    skill_assessment: 'Skill Assessment',
};

export const JENIS_MATERI = {
    dokumen: 'Dokumen',
    video: 'Video',
    tautan: 'Tautan',
    latihan_soal: 'Latihan soal',
    zoom: 'Sesi Zoom',
};
