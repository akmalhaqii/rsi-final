import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, token } from './api';

const AuthContext = createContext(null);

export const PORTAL = {
    karyawan: 'Portal Karyawan',
    hr: 'Portal HR/PSDM',
    manager: 'Portal Manager',
};

export const PERAN = {
    karyawan: 'Karyawan',
    hr: 'HR/PSDM',
    manager: 'Manager',
};

export function AuthProvider({ children }) {
    const [akun, setAkun] = useState(null);
    const [memuat, setMemuat] = useState(Boolean(token.get()));

    useEffect(() => {
        if (!token.get()) return;

        api('/me')
            .then((hasil) => setAkun(hasil.data))
            .catch(() => token.clear())
            .finally(() => setMemuat(false));
    }, []);

    const login = useCallback(async (username, password) => {
        const hasil = await api('/login', { method: 'POST', body: { username, password } });

        token.set(hasil.data.token);
        setAkun(hasil.data.akun);

        return hasil.data.akun;
    }, []);

    const logout = useCallback(async () => {
        await api('/logout', { method: 'POST' }).catch(() => {});
        token.clear();
        setAkun(null);
    }, []);

    const nilai = useMemo(
        () => ({
            akun,
            memuat,
            login,
            logout,
            hak: akun?.hak_akses,
            karyawan: akun?.karyawan,
            nama: akun?.karyawan?.nama_karyawan ?? akun?.username ?? '',
        }),
        [akun, memuat, login, logout],
    );

    return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
