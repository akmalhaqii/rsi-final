import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft, CircleAlert, Info, Loader2, RotateCw, Search, X } from 'lucide-react';
import { inisial, status as petaStatus } from '../lib/format';

const gabung = (...kelas) => kelas.filter(Boolean).join(' ');

// ---- Tombol ----------------------------------------------------------------

const VARIAN_TOMBOL = {
    primary: 'bg-brand text-white hover:bg-brand-hover',
    secondary: 'border border-line bg-white text-ink hover:bg-surface',
    soft: 'bg-brand-soft text-brand-deep hover:bg-brand-tint',
    danger: 'border border-bad/50 bg-white text-bad hover:bg-bad-soft',
    ghost: 'text-muted hover:bg-chip hover:text-ink',
};

const UKURAN_TOMBOL = {
    md: 'h-10 px-4 text-sm',
    sm: 'h-8 px-3 text-[13px]',
    lg: 'h-11 px-5 text-[15px]',
};

export function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, to, loading, className, children, ...props }) {
    const kelas = gabung(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIAN_TOMBOL[variant],
        UKURAN_TOMBOL[size],
        className,
    );
    const isi = (
        <>
            {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
            {children}
            {IconRight && <IconRight className="size-4" />}
        </>
    );

    if (to && !props.disabled) {
        return (
            <Link to={to} className={kelas} {...props}>
                {isi}
            </Link>
        );
    }

    return (
        <button type="button" className={kelas} disabled={loading || props.disabled} {...props}>
            {isi}
        </button>
    );
}

// ---- Kartu, header halaman -------------------------------------------------

export function Card({ title, subtitle, action, children, className, flush }) {
    return (
        <section className={gabung('rounded-xl border border-line bg-white', className)}>
            {(title || action) && (
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div>
                        <h2 className="text-[15px] leading-[22.5px] font-semibold text-ink">{title}</h2>
                        {subtitle && <p className="mt-0.5 text-[13px] leading-[19.5px] text-muted">{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className={flush ? '' : 'p-5'}>{children}</div>
        </section>
    );
}

export function PageHeader({ eyebrow, title, description, action, back }) {
    return (
        <div className="mb-7">
            {back && <BackLink to={back.to}>{back.label}</BackLink>}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl">
                    {eyebrow && <p className="mb-1 text-[12.5px] font-medium text-muted">{eyebrow}</p>}
                    <h1 className="text-[26px] leading-[32.5px] font-semibold tracking-[-0.39px] text-ink">{title}</h1>
                    {description && <p className="mt-1.5 text-[14.5px] leading-[23.5px] text-muted">{description}</p>}
                </div>
                {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
            </div>
        </div>
    );
}

/** Tautan kembali di atas judul halaman: ikon panah kiri + teks 14px. */
export function BackLink({ to, children }) {
    return (
        <Link to={to} className="mb-4 inline-flex items-center gap-1.5 text-sm leading-[21px] text-muted hover:text-ink">
            <ChevronLeft className="size-4" />
            {children}
        </Link>
    );
}

const NADA_TAG = {
    brand: 'bg-brand/[0.08] text-brand',
    ok: 'bg-ok/[0.08] text-ok',
    warn: 'bg-warn/[0.12] text-warn-ink',
    bad: 'bg-bad/[0.08] text-bad',
    neutral: 'bg-muted/[0.08] text-muted',
};

/** Label persegi kecil (radius 6px) untuk jenis dan kepesertaan pelatihan. */
export function Tag({ tone = 'neutral', children }) {
    return <span className={gabung('inline-flex rounded-md px-2.5 py-[5px] text-xs leading-[1.45] font-medium whitespace-nowrap', NADA_TAG[tone])}>{children}</span>;
}

/** Tab bergaris bawah dengan penghitung, mis. Semua 6 · Belum dibaca 3. */
export function Tabs({ options, value, onChange }) {
    return (
        <div role="tablist" className="flex gap-1 border-b border-line">
            {options.map(([nilai, label, jumlah]) => {
                const aktif = value === nilai;

                return (
                    <button
                        key={nilai}
                        type="button"
                        role="tab"
                        aria-selected={aktif}
                        onClick={() => onChange(nilai)}
                        className={gabung(
                            '-mb-px flex h-[39px] items-center gap-2 border-b-[1.6px] px-3 pt-1 pb-3 text-sm leading-[21px] font-medium whitespace-nowrap',
                            aktif ? 'border-brand-bright text-ink' : 'border-transparent text-muted hover:text-ink',
                        )}
                    >
                        {label}
                        {jumlah != null && (
                            <span className={gabung('rounded-full px-1.5 py-px text-[11.5px] leading-[17.25px] font-semibold', aktif ? 'bg-brand-soft text-brand-deep' : 'bg-chip text-muted')}>
                                {jumlah}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function SearchInput({ className, ...props }) {
    return (
        <span className={gabung('relative block', className)}>
            <Search className="pointer-events-none absolute top-3 left-3 size-4 text-faint" />
            <input type="search" className={gabung(KELAS_INPUT, 'h-10 pl-9')} {...props} />
        </span>
    );
}

export function Stat({ label, value, hint, tone }) {
    const warna = { ok: 'text-ok', bad: 'text-bad', brand: 'text-brand', muted: 'text-muted' }[tone] ?? 'text-ink';

    return (
        <div className="rounded-xl border border-line bg-white p-5">
            <p className="text-[13px] leading-5 text-muted">{label}</p>
            <p className={gabung('mt-3 text-[28px] leading-7 font-semibold tracking-[-0.4px]', warna)}>{value}</p>
            {hint && <p className="mt-3 text-[12.5px] leading-[19px] text-muted">{hint}</p>}
        </div>
    );
}

// ---- Badge, avatar, progres ------------------------------------------------

const NADA_BADGE = {
    ok: ['bg-ok-soft text-ok', 'bg-ok'],
    warn: ['bg-warn-soft text-warn-ink', 'bg-warn'],
    bad: ['bg-bad-soft text-bad', 'bg-bad'],
    brand: ['bg-brand-soft text-brand-deep', 'bg-brand-bright'],
    info: ['bg-info-soft text-info', 'bg-info'],
    neutral: ['bg-chip text-muted', 'bg-faint'],
};

export function Badge({ tone = 'neutral', dot = true, children }) {
    const [kelas, titik] = NADA_BADGE[tone] ?? NADA_BADGE.neutral;

    return (
        <span className={gabung('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium whitespace-nowrap', kelas)}>
            {dot && <span className={gabung('size-1.5 rounded-full', titik)} />}
            {children}
        </span>
    );
}

/** Badge untuk nilai status mentah dari API. */
export function StatusBadge({ value, dot }) {
    const [label, nada] = petaStatus(value);

    return (
        <Badge tone={nada} dot={dot}>
            {label}
        </Badge>
    );
}

export function Avatar({ name, size = 32 }) {
    return (
        <span
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-deep ring-1 ring-brand-tint"
            style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
            {inisial(name)}
        </span>
    );
}

export function Progress({ value = 0, tone }) {
    const persen = Math.max(0, Math.min(100, Number(value) || 0));
    const warna = tone ? { ok: 'bg-ok', bad: 'bg-bad', brand: 'bg-brand-bright' }[tone] : persen >= 100 ? 'bg-ok' : 'bg-brand-bright';

    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100}>
            <div className={gabung('h-full rounded-full', warna)} style={{ width: `${persen}%` }} />
        </div>
    );
}

// ---- Umpan balik -----------------------------------------------------------

const NADA_ALERT = {
    info: ['border-brand-tint bg-brand-soft', 'text-brand', Info],
    ok: ['border-ok/20 bg-ok-soft', 'text-ok', CheckCircle2],
    warn: ['border-warn/30 bg-warn-soft', 'text-warn-ink', AlertTriangle],
    bad: ['border-bad/20 bg-bad-soft', 'text-bad', CircleAlert],
};

export function Alert({ tone = 'info', title, children, action, onClose, className }) {
    const [kelas, warnaIkon, Ikon] = NADA_ALERT[tone];

    return (
        <div role={tone === 'bad' ? 'alert' : 'status'} className={gabung('flex gap-3 rounded-xl border px-4 py-3.5', kelas, className)}>
            <Ikon className={gabung('mt-0.5 size-4 shrink-0', warnaIkon)} />
            <div className="min-w-0 flex-1 text-[13.5px] leading-5">
                {title && <p className="font-semibold text-ink">{title}</p>}
                {children && <div className="text-body">{children}</div>}
                {action && <div className="mt-2.5">{action}</div>}
            </div>
            {onClose && (
                <button type="button" onClick={onClose} aria-label="Tutup" className="text-muted hover:text-ink">
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}

export function Empty({ title, children, action }) {
    return (
        <div className="px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-ink">{title}</p>
            {children && <p className="mx-auto mt-1 max-w-md text-[13.5px] text-muted">{children}</p>}
            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    );
}

export function Loading({ label = 'Memuat data…' }) {
    return (
        <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13.5px] text-muted">
            <Loader2 className="size-4 animate-spin" />
            {label}
        </div>
    );
}

/**
 * Menampilkan status muat, galat (dengan tombol coba lagi), atau isi
 * untuk hasil useApi().
 */
export function Muat({ sumber, gagal = 'Gagal memuat data', children }) {
    if (sumber.loading && sumber.data == null) return <Loading />;

    if (sumber.error) {
        return (
            <Alert
                tone="bad"
                title={gagal}
                action={
                    <Button size="sm" icon={RotateCw} onClick={sumber.reload}>
                        Coba Lagi
                    </Button>
                }
            >
                {sumber.error.message}
            </Alert>
        );
    }

    return children(sumber.data, sumber.message);
}

/** Menjalankan aksi tulis (POST/PUT/DELETE) dan menyimpan pesan hasilnya. */
export function useAksi() {
    const [state, setState] = useState({ sibuk: false, sukses: null, galat: null });

    const jalankan = useCallback(async (aksi, sesudah) => {
        setState({ sibuk: true, sukses: null, galat: null });

        try {
            const hasil = await aksi();
            setState({ sibuk: false, sukses: hasil?.message ?? 'Berhasil disimpan', galat: null });
            sesudah?.(hasil);

            return hasil;
        } catch (galat) {
            setState({ sibuk: false, sukses: null, galat });

            return null;
        }
    }, []);

    const reset = useCallback(() => setState({ sibuk: false, sukses: null, galat: null }), []);

    return { ...state, jalankan, reset };
}

export function Umpan({ aksi, className = 'mb-5' }) {
    if (aksi.galat) {
        const rincian = Object.values(aksi.galat.errors ?? {}).flat();

        return (
            <Alert tone="bad" title={aksi.galat.message} onClose={aksi.reset} className={className}>
                {rincian.length > 1 && (
                    <ul className="mt-1 list-disc pl-4">
                        {rincian.map((pesan) => (
                            <li key={pesan}>{pesan}</li>
                        ))}
                    </ul>
                )}
            </Alert>
        );
    }

    if (aksi.sukses) {
        return <Alert tone="ok" title={aksi.sukses} onClose={aksi.reset} className={className} />;
    }

    return null;
}

// ---- Tabel -----------------------------------------------------------------

export function Table({ columns, rows, rowKey = 'id', empty = 'Belum ada data' }) {
    if (!rows?.length) return <Empty title={empty} />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                    <tr>
                        {columns.map((kolom) => (
                            <th
                                key={kolom.label}
                                className={gabung(
                                    'border-b border-line bg-surface px-5 py-3 text-xs leading-[18px] font-semibold tracking-[0.3px] text-muted uppercase whitespace-nowrap',
                                    kolom.right && 'text-right',
                                )}
                            >
                                {kolom.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((baris, indeks) => (
                        <tr key={baris[rowKey] ?? indeks} className="border-b border-line/70 last:border-b-0">
                            {columns.map((kolom) => (
                                <td key={kolom.label} className={gabung('px-5 py-3.5 align-middle text-[13.5px] leading-5 text-ink', kolom.right && 'text-right')}>
                                    {kolom.render(baris)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Dua baris teks dalam satu sel: judul dan keterangan. */
export function Cell({ title, sub }) {
    return (
        <div>
            <p className="font-medium text-ink">{title}</p>
            {sub && <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>}
        </div>
    );
}

// ---- Formulir --------------------------------------------------------------

const KELAS_INPUT =
    'w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-brand-bright focus:outline-none disabled:bg-surface disabled:text-muted';

export function Field({ label, hint, error, required, children, className }) {
    return (
        <label className={gabung('block', className)}>
            <span className="mb-1.5 block text-[13px] leading-[19.5px] font-medium text-ink">
                {label}
                {required && <span className="text-bad"> *</span>}
            </span>
            {children}
            {error ? (
                <span className="mt-1 block text-[12.5px] text-bad">{error}</span>
            ) : (
                hint && <span className="mt-1 block text-[12.5px] text-muted">{hint}</span>
            )}
        </label>
    );
}

/**
 * Kelas kontrol formulir. Lebar dan tinggi bawaan (w-full, h-10) dilepas bila
 * pemanggil menentukannya sendiri, supaya tidak bergantung pada urutan CSS.
 */
const kelasKontrol = (className = '', tambahan = '') =>
    gabung(/(^|\s)(max-)?w-/.test(className) ? KELAS_INPUT.replace('w-full ', '') : KELAS_INPUT, /(^|\s)h-/.test(className) ? '' : 'h-10', tambahan, className);

export function Input({ className, ...props }) {
    return <input className={kelasKontrol(className)} {...props} />;
}

export function Textarea({ className, ...props }) {
    return <textarea rows={3} className={gabung(KELAS_INPUT, 'py-2.5', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
    return (
        <select className={kelasKontrol(className, 'pr-8')} {...props}>
            {children}
        </select>
    );
}

/** Pilihan tersegmentasi, mis. Semua / Belum selesai / Selesai. */
export function Segmented({ options, value, onChange }) {
    return (
        <div className="inline-flex rounded-lg border border-line bg-white p-1">
            {options.map(([nilai, label, jumlah]) => (
                <button
                    key={nilai}
                    type="button"
                    onClick={() => onChange(nilai)}
                    aria-pressed={value === nilai}
                    className={gabung(
                        'rounded-md px-3 py-1 text-[13px] font-medium whitespace-nowrap',
                        value === nilai ? 'bg-brand-soft text-brand-deep' : 'text-muted hover:text-ink',
                    )}
                >
                    {label}
                    {jumlah != null && <span className="ml-1.5 text-[11.5px] opacity-80">{jumlah}</span>}
                </button>
            ))}
        </div>
    );
}

export function Modal({ title, children, onClose, footer }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Tutup" className="text-muted hover:text-ink">
                        <X className="size-4" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
            </div>
        </div>
    );
}

/** Daftar pasangan label–nilai, mis. informasi sesi pelatihan. */
export function Rincian({ items }) {
    return (
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(([label, nilai]) => (
                <div key={label}>
                    <dt className="text-[12px] text-muted">{label}</dt>
                    <dd className="mt-1 text-sm font-medium text-ink">{nilai ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}
