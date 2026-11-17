import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck, ClipboardCheck, Eye, EyeOff, Gauge, Lock, User } from 'lucide-react';
import logo from '../assets/logo.svg';
import pola from '../assets/login-pattern.svg';
import { Alert, Button } from '../components/ui';
import { useAuth } from '../lib/auth';

const FITUR = [
    [CalendarCheck, 'Target & jadwal pelatihan', 'Pantau pelatihan wajib dan mandiri beserta presensinya.'],
    [ClipboardCheck, 'Skill assessment berkala', 'Ukur kompetensi jabatan secara terpisah dari tes pelatihan.'],
    [Gauge, 'Penerapan di kinerja', 'Hubungkan pengembangan kompetensi dengan capaian KPI.'],
];

export default function Login() {
    const { akun, login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [tampil, setTampil] = useState(false);
    const [sibuk, setSibuk] = useState(false);
    const [galat, setGalat] = useState(null);

    if (akun) return <Navigate to="/" replace />;

    const kirim = async (event) => {
        event.preventDefault();
        setSibuk(true);
        setGalat(null);

        try {
            await login(form.username, form.password);
            navigate('/', { replace: true });
        } catch (error) {
            setGalat(error.message);
            setSibuk(false);
        }
    };

    const ubah = (kunci) => (event) => setForm((lama) => ({ ...lama, [kunci]: event.target.value }));

    return (
        <div className="flex min-h-screen bg-canvas">
            <div className="relative hidden w-[640px] max-w-[45%] shrink-0 flex-col overflow-hidden bg-ink p-12 lg:flex">
                <div className="flex items-center gap-2.5">
                    <img src={logo} alt="" width={34} height={34} />
                    <span className="text-[19px] leading-[28.5px] font-semibold tracking-[-0.38px] text-white">
                        Skill<span className="text-brand-bright">Grow</span>
                    </span>
                </div>

                <img src={pola} alt="" width={520} height={520} className="pointer-events-none absolute top-[305px] left-[216px] max-w-none" />

                <div className="relative my-auto">
                    <h2 className="max-w-md text-[34px] leading-[39.1px] font-semibold tracking-[-0.68px] text-white">
                        Kembangkan kompetensi karyawan, dari pelatihan hingga kinerja nyata.
                    </h2>
                    <ul className="mt-10 space-y-5">
                        {FITUR.map(([Ikon, judul, isi]) => (
                            <li key={judul} className="flex items-start gap-4">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07]">
                                    <Ikon className="size-[19px] text-brand-bright" strokeWidth={1.75} />
                                </span>
                                <span>
                                    <span className="block text-[15px] leading-[22.5px] font-medium text-white">{judul}</span>
                                    <span className="mt-0.5 block text-[13.5px] leading-[20.25px] text-white/60">{isi}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-1 items-center justify-center px-6 py-10">
                    <form onSubmit={kirim} className="w-full max-w-[420px]">
                        <h1 className="text-[26px] leading-[39px] font-semibold tracking-[-0.39px] text-ink">Masuk ke SkillGrow</h1>
                        <p className="mt-1.5 text-[14.5px] leading-[21.75px] text-muted">Gunakan akun karyawan yang terdaftar di perusahaan Anda.</p>

                        {galat && (
                            <Alert tone="bad" title={galat} className="mt-5" />
                        )}

                        <label className="mt-6 block">
                            <span className="text-[13px] leading-[19.5px] font-medium text-ink">Username</span>
                            <span className="relative mt-1.5 block">
                                <User className="absolute top-3.5 left-3 size-4 text-muted" />
                                <input
                                    value={form.username}
                                    onChange={ubah('username')}
                                    autoComplete="username"
                                    autoFocus
                                    required
                                    className="h-11 w-full rounded-lg border border-line bg-white pr-3 pl-9 text-sm text-ink focus:border-brand-bright focus:outline-none"
                                />
                            </span>
                        </label>

                        <label className="mt-4 block">
                            <span className="text-[13px] leading-[19.5px] font-medium text-ink">Kata Sandi</span>
                            <span className="relative mt-1.5 block">
                                <Lock className="absolute top-3.5 left-3 size-4 text-muted" />
                                <input
                                    type={tampil ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={ubah('password')}
                                    autoComplete="current-password"
                                    required
                                    className="h-11 w-full rounded-lg border border-line bg-white pr-11 pl-9 text-sm text-ink focus:border-brand-bright focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setTampil((nilai) => !nilai)}
                                    aria-label={tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                    className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-md text-muted hover:bg-chip"
                                >
                                    {tampil ? <EyeOff className="size-[17px]" /> : <Eye className="size-[17px]" />}
                                </button>
                            </span>
                        </label>

                        <Button type="submit" variant="primary" size="lg" iconRight={ArrowRight} loading={sibuk} className="mt-7 w-full">
                            Masuk ke Sistem
                        </Button>
                    </form>
                </div>
                <footer className="px-6 pb-6 text-xs leading-[18px] text-muted">© {new Date().getFullYear()} SkillGrow</footer>
            </div>
        </div>
    );
}
