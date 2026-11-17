import { useCallback, useEffect, useState } from 'react';

const KUNCI_TOKEN = 'skillgrow.token';

export const token = {
    get: () => localStorage.getItem(KUNCI_TOKEN),
    set: (nilai) => localStorage.setItem(KUNCI_TOKEN, nilai),
    clear: () => localStorage.removeItem(KUNCI_TOKEN),
};

export class ApiError extends Error {
    constructor(message, status, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

/**
 * Memanggil API SkillGrow. Mengembalikan { data, message } dari respons,
 * atau melempar ApiError berisi pesan dari server.
 */
export async function api(path, { method = 'GET', body, params } = {}) {
    const url = new URL(`/api${path}`, window.location.origin);

    Object.entries(params ?? {}).forEach(([kunci, nilai]) => {
        if (nilai !== '' && nilai != null) url.searchParams.set(kunci, nilai);
    });

    let respons;

    try {
        respons = await fetch(url, {
            method,
            headers: {
                Accept: 'application/json',
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(token.get() ? { Authorization: `Bearer ${token.get()}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 0);
    }

    const json = await respons.json().catch(() => ({}));

    if (!respons.ok) {
        if (respons.status === 401 && token.get()) {
            token.clear();
            window.location.assign('/login');
        }

        throw new ApiError(json.message ?? 'Terjadi kesalahan pada server.', respons.status, json.errors);
    }

    return json;
}

/** Memuat data GET dan menyediakan status muat, galat, serta fungsi muat ulang. */
export function useApi(path, params) {
    const [state, setState] = useState({ data: null, message: null, loading: true, error: null });
    const kunci = JSON.stringify(params ?? {});

    const muat = useCallback(async () => {
        if (!path) return;

        setState((lama) => ({ ...lama, loading: true, error: null }));

        try {
            const hasil = await api(path, { params: JSON.parse(kunci) });
            setState({ data: hasil.data ?? null, message: hasil.message ?? null, loading: false, error: null });
        } catch (galat) {
            setState({ data: null, message: null, loading: false, error: galat });
        }
    }, [path, kunci]);

    useEffect(() => {
        muat();
    }, [muat]);

    return { ...state, reload: muat };
}
