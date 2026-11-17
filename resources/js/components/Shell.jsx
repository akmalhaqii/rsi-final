import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Activity,
    Bell,
    BookOpen,
    CalendarDays,
    CircleUser,
    ClipboardCheck,
    ClipboardList,
    FileCheck2,
    FolderClock,
    FolderOpen,
    Gauge,
    Inbox,
    LayoutGrid,
    LogOut,
    Menu,
    Sparkles,
    Target,
    Users,
    UsersRound,
    X,
} from 'lucide-react';
import logo from '../assets/logo.svg';
import { useApi } from '../lib/api';
import { PERAN, PORTAL, useAuth } from '../lib/auth';
import { hariIni } from '../lib/format';
import { Avatar } from './ui';

/** Navigasi sidebar per hak akses: [judul kelompok, [[label, rute, ikon]]]. */
const NAVIGASI = {
    karyawan: [
        [null, [['Dashboard', '/', LayoutGrid]]],
        [
            'Pengembangan',
            [
                ['Daftar Pelatihan', '/pelatihan', BookOpen],
                ['Rekomendasi Pelatihan', '/rekomendasi', Sparkles],
                ['Target Pelatihan', '/target', Target],
                ['Jadwal Pelatihan', '/jadwal', CalendarDays],
                ['Skill Assessment', '/assessment', ClipboardCheck],
                ['Pelatihan Aktif', '/pelatihan-aktif', FolderOpen],
                ['Riwayat Pelatihan', '/riwayat', FolderClock],
            ],
        ],
        ['Akun', [['Notifikasi', '/notifikasi', Bell], ['Profil', '/profil', CircleUser]]],
    ],
    hr: [
        [null, [['Dashboard', '/', LayoutGrid]]],
        [
            'Pengelolaan',
            [
                ['Kelola Pelatihan', '/hr/pelatihan', ClipboardList],
                ['Pengajuan Pelatihan', '/hr/pengajuan', Inbox],
                ['Data Karyawan', '/hr/karyawan', UsersRound],
                ['Skill Assessment', '/hr/assessment', ClipboardCheck],
                ['Monitoring', '/hr/monitoring', Activity],
                ['Tinjauan Nilai KPI', '/hr/kpi', FileCheck2],
            ],
        ],
        [
            'Pengembangan Saya',
            [
                ['Daftar Pelatihan', '/pelatihan', BookOpen],
                ['Skill Assessment', '/assessment', ClipboardCheck],
                ['Riwayat Pelatihan', '/riwayat', FolderClock],
            ],
        ],
        ['Lainnya', [['Notifikasi', '/notifikasi', Bell], ['Profil', '/profil', CircleUser]]],
    ],
    manager: [
        [null, [['Dashboard', '/', LayoutGrid]]],
        [
            'Kinerja Tim',
            [
                ['Data KPI Staf', '/manager/kpi', Gauge],
                ['Target Capaian', '/manager/target', Users],
            ],
        ],
        ['Akun', [['Profil', '/profil', CircleUser]]],
    ],
};

const cocok = (rute, lokasi) => (rute === '/' ? lokasi === '/' : lokasi === rute || lokasi.startsWith(`${rute}/`));

function Wordmark() {
    return (
        <span className="flex items-center gap-2.5">
            <img src={logo} alt="" width={30} height={30} />
            <span className="text-[19px] leading-[28.5px] font-semibold tracking-[-0.38px] text-ink">
                Skill<span className="text-brand-bright">Grow</span>
            </span>
        </span>
    );
}

function Sidebar({ belumDibaca, onNavigate }) {
    const { hak, nama, karyawan, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const keluar = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex h-16 shrink-0 items-center px-5">
                <Wordmark />
            </div>
            <div className="px-5 pb-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-chip px-2 py-1 text-[11.5px] leading-[17.25px] font-semibold tracking-[0.29px] text-muted uppercase">
                    <span className="size-1.5 rounded-full bg-brand-bright" />
                    {PORTAL[hak]}
                </span>
            </div>

            <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-2">
                {NAVIGASI[hak]?.map(([kelompok, item], indeks) => (
                    <div key={kelompok ?? indeks} className={indeks > 0 ? 'pt-5' : ''}>
                        {kelompok && (
                            <p className="px-3 pb-1.5 text-[11px] leading-[16.5px] font-semibold tracking-[0.88px] text-faint uppercase">{kelompok}</p>
                        )}
                        <ul className="space-y-0.5">
                            {item.map(([label, rute, Ikon]) => {
                                const aktif = cocok(rute, pathname);

                                return (
                                    <li key={rute}>
                                        <NavLink
                                            to={rute}
                                            onClick={onNavigate}
                                            aria-current={aktif ? 'page' : undefined}
                                            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm leading-[21px] ${
                                                aktif ? 'bg-brand-soft font-semibold text-brand-deep' : 'font-medium text-nav hover:bg-chip'
                                            }`}
                                        >
                                            {aktif && <span className="absolute top-1.5 left-0 h-[25px] w-[3px] rounded-r-full bg-brand-bright" />}
                                            <Ikon className={`size-[18px] ${aktif ? 'text-brand' : ''}`} strokeWidth={1.75} />
                                            <span className="flex-1">{label}</span>
                                            {rute === '/notifikasi' && belumDibaca > 0 && (
                                                <span className="rounded-full bg-brand px-1.5 text-[11px] leading-[18px] font-semibold text-white">{belumDibaca}</span>
                                            )}
                                        </NavLink>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            <div className="shrink-0 border-t border-line p-3">
                <div className="flex items-center gap-3 p-2">
                    <Avatar name={nama} size={34} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] leading-[20.25px] font-semibold text-ink">{nama}</p>
                        <p className="truncate text-xs leading-[18px] text-muted">{karyawan?.jabatan ?? PERAN[hak]}</p>
                    </div>
                    <button
                        type="button"
                        onClick={keluar}
                        aria-label="Keluar"
                        title="Keluar"
                        className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip hover:text-ink"
                    >
                        <LogOut className="size-[18px]" strokeWidth={1.75} />
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Judul halaman untuk breadcrumb, dari rute yang sedang dibuka. */
function judulHalaman(hak, pathname) {
    const semua = (NAVIGASI[hak] ?? []).flatMap(([, item]) => item);
    const temuan = semua.filter(([, rute]) => cocok(rute, pathname)).sort((a, b) => b[1].length - a[1].length)[0];

    const lain = [
        ['/tes', 'Mengerjakan Test'],
        ['/presensi', 'Mengisi Presensi'],
    ].find(([rute]) => pathname.startsWith(rute));

    return temuan?.[0] ?? lain?.[1] ?? 'SkillGrow';
}

export default function Shell() {
    const { hak, nama } = useAuth();
    const { pathname } = useLocation();
    const [menuTerbuka, setMenuTerbuka] = useState(false);

    // Manager tidak memiliki notifikasi pelatihan.
    const notifikasi = useApi(hak === 'manager' ? null : '/notifikasi');
    const belumDibaca = (notifikasi.data ?? []).filter((item) => !item.status_baca).length;

    return (
        <div className="min-h-screen bg-canvas">
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line lg:block">
                <Sidebar belumDibaca={belumDibaca} />
            </aside>

            {menuTerbuka && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuTerbuka(false)} />
                    <aside className="absolute inset-y-0 left-0 w-[264px] border-r border-line shadow-xl">
                        <Sidebar belumDibaca={belumDibaca} onNavigate={() => setMenuTerbuka(false)} />
                    </aside>
                </div>
            )}

            <div className="lg:pl-[264px]">
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-sm sm:px-8">
                    <button
                        type="button"
                        onClick={() => setMenuTerbuka((buka) => !buka)}
                        aria-label="Buka menu"
                        className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip lg:hidden"
                    >
                        {menuTerbuka ? <X className="size-5" /> : <Menu className="size-5" />}
                    </button>

                    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13.5px] leading-[20.25px]">
                        <span className="hidden text-muted sm:inline">{PORTAL[hak]}</span>
                        <span className="hidden text-divider sm:inline">/</span>
                        <span className="truncate font-medium text-ink">{judulHalaman(hak, pathname)}</span>
                    </nav>

                    <div className="ml-auto flex items-center gap-3">
                        <span className="hidden items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] leading-[18.75px] text-muted md:inline-flex">
                            <CalendarDays className="size-3.5" />
                            {hariIni()}
                        </span>
                        {hak !== 'manager' && (
                            <NavLink
                                to="/notifikasi"
                                aria-label={`Notifikasi, ${belumDibaca} belum dibaca`}
                                className="relative flex size-9 items-center justify-center rounded-lg text-nav hover:bg-chip"
                            >
                                <Bell className="size-[18px]" strokeWidth={1.75} />
                                {belumDibaca > 0 && (
                                    <span className="absolute -top-0.5 left-5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10.5px] font-semibold text-white ring-2 ring-white">
                                        {belumDibaca}
                                    </span>
                                )}
                            </NavLink>
                        )}
                        <span className="hidden h-6 w-px bg-line sm:block" />
                        <NavLink to="/profil" className="flex items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 hover:bg-chip">
                            <Avatar name={nama} size={32} />
                            <span className="hidden sm:block">
                                <span className="block text-[13px] leading-[16.25px] font-semibold text-ink">{nama}</span>
                                <span className="block text-[11.5px] leading-[14.4px] text-muted">{PERAN[hak]}</span>
                            </span>
                        </NavLink>
                    </div>
                </header>

                <main className="mx-auto max-w-[1280px] px-4 py-9 sm:px-8">
                    <Outlet context={{ muatUlangNotifikasi: notifikasi.reload }} />
                </main>
            </div>
        </div>
    );
}
