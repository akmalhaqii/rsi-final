import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import Shell from './components/Shell';
import { Button, Empty, Loading } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import Login from './pages/Login';
import { Dashboard, Profil } from './pages/Umum';
import Notifikasi from './pages/karyawan/Notifikasi';
import { JadwalPelatihan, RiwayatPelatihan, TargetPelatihan } from './pages/karyawan/Aktivitas';
import { DaftarTugas, IsiAssessment, KerjakanTes, SkillAssessment } from './pages/karyawan/Assessment';
import { DaftarPelatihan, DetailPelatihan, MateriPelatihan, PelatihanAktif, Presensi, Rekomendasi } from './pages/karyawan/Pelatihan';
import { DataKaryawan, DetailKpiHr, Monitoring, Pengajuan, TinjauAssessment, TinjauKpi } from './pages/hr/Lainnya';
import { DetailKelola, FormPelatihan, KelolaPelatihan, KelolaPeserta } from './pages/hr/Pelatihan';
import { DataKpi, PenilaianKpi, TargetCapaian } from './pages/manager/Kpi';

/** Hanya untuk pengguna yang sudah login. */
function Terlindung() {
    const { akun, memuat } = useAuth();

    if (memuat) return <Loading label="Memuat SkillGrow…" />;
    if (!akun) return <Navigate to="/login" replace />;

    return <Shell />;
}

/** Membatasi kelompok rute pada hak akses tertentu (akses ditolak, UC-04). */
function Hak({ izin }) {
    const { hak } = useAuth();
    const konteks = useOutletContext();

    if (!izin.includes(hak)) {
        return (
            <Empty title="Akses ditolak" action={<Button to="/">Kembali ke Dashboard</Button>}>
                Anda tidak memiliki izin untuk membuka halaman ini.
            </Empty>
        );
    }

    // Meneruskan konteks Shell (mis. muat ulang notifikasi) ke halaman di bawahnya.
    return <Outlet context={konteks} />;
}

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Terlindung />}>
                <Route index element={<Dashboard />} />
                <Route path="profil" element={<Profil />} />

                <Route element={<Hak izin={['karyawan', 'hr']} />}>
                    <Route path="notifikasi" element={<Notifikasi />} />
                </Route>

                {/* HR/PSDM adalah generalisasi dari Karyawan, jadi ikut memakai fitur ini. */}
                <Route element={<Hak izin={['karyawan', 'hr']} />}>
                    <Route path="pelatihan" element={<DaftarPelatihan />} />
                    <Route path="pelatihan/:id" element={<DetailPelatihan />} />
                    <Route path="pelatihan/:id/materi" element={<MateriPelatihan />} />
                    <Route path="presensi/:id" element={<Presensi />} />
                    <Route path="pelatihan-aktif" element={<PelatihanAktif />} />
                    <Route path="rekomendasi" element={<Rekomendasi />} />
                    <Route path="target" element={<TargetPelatihan />} />
                    <Route path="jadwal" element={<JadwalPelatihan />} />
                    <Route path="riwayat" element={<RiwayatPelatihan />} />
                    <Route path="assessment" element={<SkillAssessment />} />
                    <Route path="assessment/tugas" element={<DaftarTugas />} />
                    <Route path="assessment/isi" element={<IsiAssessment />} />
                    <Route path="tes/:id/:jenis" element={<KerjakanTes />} />
                </Route>

                <Route path="hr" element={<Hak izin={['hr']} />}>
                    <Route path="pelatihan" element={<KelolaPelatihan />} />
                    <Route path="pelatihan/baru" element={<FormPelatihan />} />
                    <Route path="pelatihan/:id" element={<DetailKelola />} />
                    <Route path="pelatihan/:id/edit" element={<FormPelatihan />} />
                    <Route path="pelatihan/:id/peserta" element={<KelolaPeserta />} />
                    <Route path="pengajuan" element={<Pengajuan />} />
                    <Route path="karyawan" element={<DataKaryawan />} />
                    <Route path="assessment" element={<TinjauAssessment />} />
                    <Route path="monitoring" element={<Monitoring />} />
                    <Route path="kpi" element={<TinjauKpi />} />
                    <Route path="kpi/:id" element={<DetailKpiHr />} />
                </Route>

                <Route path="manager" element={<Hak izin={['manager']} />}>
                    <Route path="kpi" element={<DataKpi />} />
                    <Route path="kpi/:id" element={<PenilaianKpi />} />
                    <Route path="target" element={<TargetCapaian />} />
                </Route>

                <Route path="*" element={<Empty title="Halaman tidak ditemukan" action={<Button to="/">Kembali ke Dashboard</Button>} />} />
            </Route>
        </Routes>
    );
}

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>,
);
