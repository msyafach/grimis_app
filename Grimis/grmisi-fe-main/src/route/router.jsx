import { createBrowserRouter, Navigate } from "react-router-dom";
import RootLayout from "../layout/root";
import PageNotFound from "../pages/error/page-not-found";
import ProtectedRoute from '../components/ProtectedRoute';

import LayoutAuth from "../layout/layoutAuth";

import Login from "../pages/auth/login";

import PetaRisikoIndex from "../pages/peta-risiko/index";
import PetaRisikoSettingIndex from "../pages/peta-risiko/settings";

import Instansi from "../pages/instansi";
import InstansiTambah from "../pages/instansi/tambah";
import InstansiDetail from "../pages/instansi/detail";
import InstansiEdit from "../pages/instansi/edit";

import IndukUnitKerja from "../pages/induk-unit-kerja/induk-unit-kerja";
import IndukUnitKerjaTambah from "../pages/induk-unit-kerja/induk-unit-kerja-tambah";
import IndukUnitKerjaEditContent from "../pages/induk-unit-kerja/induk-unit-kerja-edit";
import IndukUnitKerjaDetail from "../pages/induk-unit-kerja/detail";

import StrukturOrganisasi from "../pages/parameters-struktur-organisasi";
import StrukturOrganisasiTambah from "../pages/parameters-struktur-organisasi-tambah";
import StrukturOrganisasiDetail from "../pages/parameters-struktur-organisasi-detail";
import StrukturOrganisasiEdit from "../pages/parameters-struktur-organisasi-edit";
import StrukturOrganisasiPengguna from "../pages/struktur-organisasi/parameters-struktur-organisasi-pengguna";
import StrukturOrganisasiPenggunaTambah from "../pages/struktur-organisasi/parameters-struktur-organisasi-pengguna-tambah";
import StrukturOrganisasiPenggunaDetail from "../pages/struktur-organisasi/parameters-struktur-organisasi-pengguna-detail";

import KategoriRisiko from "../pages/kategori-risiko/index";
import KategoriRisikoTambah from "../pages/parameters-kategori-risiko-tambah";
import KategoriRisikoEdit from "../pages/kategori-risiko/edit";
import KategoriRisikoDetail from "../pages/kategori-risiko/detail";

import JenisPenyebab from "../pages/parameters-jenis-penyebab";
import JenisPenyebabTambah from "../pages/parameters-jenis-penyebab-tambah";
import JenisPenyebabDetail from "../pages/jenis-penyebab/detail";
import JenisPenyebabEdit from "../pages/jenis-penyebab/edit";

import KonteksSasaran from "../pages/konteks/sasaran/index";
import KonteksSasaranTambah from "../pages/konteks/sasaran/tambah";
import KonteksSasaranEdit from "../pages/konteks/sasaran/edit";
import KonteksSasaranDetail from "../pages/konteks/sasaran/detail";

import KonteksSasaranIndikatorIndex from "../pages/konteks/sasaran/indikator";
import KonteksSasaranIndikatorTambah from "../pages/konteks/sasaran/indikator/tambah";
import KonteksSasaranIndikatorEdit from "../pages/konteks/sasaran/indikator/edit";
import KonteksSasaranIndikatorDetail from "../pages/konteks/sasaran/indikator/detail";

import KonteksProbisIndex from "../pages/konteks/probis";
import KonteksProbisTambah from "../pages/konteks/probis/tambah";
import KonteksProbisEdit from "../pages/konteks/probis/edit";
import KonteksProbisDetail from "../pages/konteks/probis/detail";

import KamusRisiko from "../pages/parameters-kamus-risiko";
import KamusRisikoTambah from "../pages/kamus-risiko/tambah";
import KamusRisikoEdit from "../pages/kamus-risiko/edit";
import KamusRisikoDetail from "../pages/kamus-risiko/detail";

import BaganRisikoIndex from "../pages/bagan-risiko";
import BaganRisikoTambah from "../pages/bagan-risiko/tambah";
import BaganRisikoEdit from "../pages/bagan-risiko/edit";
import BaganRisikoDetail from "../pages/bagan-risiko/detail";

import MetodeSpipIndex from "../pages/metode-spip";

import ManajemenPengguna from "../pages/users/manajemen-pengguna";
import ManajemenPenggunaTambah from "../pages/users/manajemen-pengguna-tambah";
import ManajemenPenggunaEdit from "../pages/users/manajemen-pengguna-edit";
import ManajemenPenggunaDetail from "../pages/users/detail";

import IdentifikasiRisikoIndex from "../pages/pengelolaan-risiko";
import IdentifikasiRisikoTambah from "../pages/pengelolaan-risiko/identifikasi/tambah";
import IdentifikasiRisikoEdit from "../pages/pengelolaan-risiko/identifikasi/edit";
import IdentifikasiRisikoEditIden from "../pages/pengelolaan-risiko/identifikasi/editIden";
import IdentifikasiRisikoDetail from "../pages/pengelolaan-risiko/identifikasi/detail";
import IdentifikasiRisikoDetailIden from "../pages/pengelolaan-risiko/identifikasi/detailIden";

import AnalisisInherent from "../pages/pengelolaan-risiko/analisis/inherent-detail";
import AnalisisInherentEdit from "../pages/pengelolaan-risiko/analisis/inherent-edit";
import AnalisisResidual from "../pages/pengelolaan-risiko/analisis/residual-detail";
import AnalisisResidualEdit from "../pages/pengelolaan-risiko/analisis/residual-edit";
import AnalisisTreated from "../pages/pengelolaan-risiko/analisis/treated-detail";
import AnalisisTreatedEdit from "../pages/pengelolaan-risiko/analisis/treated-edit";
import AnalisisActual from "../pages/pengelolaan-risiko/analisis/actual-detail";
import AnalisisActualEdit from "../pages/pengelolaan-risiko/analisis/actual-edit";
import AnalisisExistingControl from "../pages/pengelolaan-risiko/analisis/existing-control";
import AnalisisExistingControlEdit from "../pages/pengelolaan-risiko/analisis/existing-control-edit";

import KriteriaRisikoKemungkinanIndex from "../pages/kriteria-risiko/kemungkinan";
import KriteriaRisikoKemungkinanTambah from "../pages/kriteria-risiko/kemungkinan/tambah";
import KriteriaRisikoKemungkinanEdit from "../pages/kriteria-risiko/kemungkinan/edit";
import KriteriaRisikoKemungkinanDetail from "../pages/kriteria-risiko/kemungkinan/detail";

import KriteriaRisikoDampakIndex from "../pages/kriteria-risiko/dampak";
import KriteriaRisikoDampakTambah from "../pages/kriteria-risiko/dampak/tambah";
import KriteriaRisikoDampakEdit from "../pages/kriteria-risiko/dampak/edit";
import KriteriaRisikoDampakDetail from "../pages/kriteria-risiko/dampak/detail";

import RegisterRisiko from "../pages/pengelolaan-register-risiko";
import RegisterRisikoDetail from "../pages/pengelolaan-register-risiko-detail";
import RegisterRisikoEdit from "../pages/registrasi-risiko/pengelolaan-register-risiko-edit";

import InherentRisk from "../pages/pengelolaan-risiko-inherent-risk";
import ResidualRisk from "../pages/pengelolaan-risiko-residual-risk";
import TreatedlRisk from "../pages/pengelolaan-risiko-treated-risk";
import ActualRisk from "../pages/pengelolaan-risiko-actual-risk";
import RegisterRisikoTambah from "../pages/pengelolaan-register-risiko-tambah";
import EvaluasiRisikoDetail from "../pages/pengelolaan-risiko/evaluasi/detail";
import EvaluasiRisiko from "../pages/pengendalian-risiko-evaluasi-risiko";
import EvaluasiRisikoTambah from "../pages/pengelolaan-risiko/evaluasi/tambah";
import EvaluasiRisikoEdit from "../pages/pengendalian-risiko-evaluasi-risiko-edit";
import EvaluasiRisikoRtpIndex from "../pages/pengelolaan-risiko/evaluasi/index-rtp";
import EvaluasiRisikoRtpRealisasi from "../pages/pengelolaan-risiko/evaluasi/realisasi-rtp";
import EvaluasiRisikoRtpEdit from "../pages/pengelolaan-risiko/evaluasi/edit-rtp";
import EvaluasiRisikoRtpDetail from "../pages/pengelolaan-risiko/evaluasi/detail-rtp";
import EvaluasiRisikoRtpDetailIndex from "../pages/pengelolaan-risiko/evaluasi/index-detail-rtp";
import EvaluasiRisikoRtpTambah from "../pages/pengelolaan-risiko/evaluasi/tambah-rtp";

import ProsesAkhirTahun from "../pages/pengelolaan-risiko/akhir-tahun";

// Add import for Laporan Kejadian pages
import LaporanKejadianForm from "../pages/laporan-kejadian/LaporanKejadianForm";
import LaporanKejadianDetail from "../pages/laporan-kejadian/LaporanKejadianDetail";
import LaporanKejadianIndex from "../pages/approval/laporan-kejadian/index";

// Add import for Kamus Risiko Approval
import KamusRisikoApprovalIndex from "../pages/approval/kamus-risiko/index";

// Add import for Monitoring Risiko pages
import MonitoringRisiko from "../pages/pengelolaan-risiko/MonitoringRisiko";
import MonitoringRisikoDetail from "../pages/pengelolaan-risiko/MonitoringRisikoDetail";
import MonitoringRisikoEdit from "../pages/pengelolaan-risiko/MonitoringRisikoEdit";
import MonitoringRisikoTambah from "../pages/pengelolaan-risiko/MonitoringRisikoTambah";

// Add import for Profile pages
import ProfileDetails from "../pages/profile/details";
import EditProfile from "../pages/profile/edit";
import ChangePassword from "../pages/profile/change-password";

// Add import for Pelaporan Risiko pages
import PelaporanRisiko from "../pages/pengelolaan-risiko/pelaporan-risiko";

// Add import for Pengaturan Kop Surat
import PengaturanKopSuratForm from "../pages/pengaturan/kop-surat/PengaturanKopSuratForm";

// Add import for Notifications History
import NotificationsIndex from "../pages/notifications/index";

// Add import for Group Management
import GroupManagement from "../pages/group-management";
import GroupTambah from "../pages/group-management/tambah";
import GroupEdit from "../pages/group-management/edit";
import GroupDetail from "../pages/group-management/detail";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                path: "/",
                element: (
                    <ProtectedRoute>
                        <PetaRisikoIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/peta-risiko/setting",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEMILIK_RISIKO']}>
                        <PetaRisikoSettingIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengaturan/kop-surat",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <PengaturanKopSuratForm />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/struktur-organisasi",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <StrukturOrganisasi />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <StrukturOrganisasiTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/detail/:strukturOrganisasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <StrukturOrganisasiDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/edit/:strukturOrganisasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <StrukturOrganisasiEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/users/:strukturOrganisasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <StrukturOrganisasiPengguna />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/users/:strukturOrganisasiId/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <StrukturOrganisasiPenggunaTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/struktur-organisasi/users/:strukturOrganisasiId/detail/:userId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <StrukturOrganisasiPenggunaDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/kategori-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KategoriRisiko />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kategori-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KategoriRisikoTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kategori-risiko/edit/:kategoriRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KategoriRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kategori-risiko/detail/:kategoriRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KategoriRisikoDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/jenis-penyebab",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <JenisPenyebab />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/jenis-penyebab/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <JenisPenyebabTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/jenis-penyebab/detail/:jenisPenyebabId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <JenisPenyebabDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/jenis-penyebab/edit/:jenisPenyebabId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <JenisPenyebabEdit />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/konteks-sasaran",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksSasaran />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KonteksSasaranTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/edit/:konteksSasaranId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KonteksSasaranEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/detail/:konteksSasaranId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksSasaranDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/indikator/:konteksSasaranId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksSasaranIndikatorIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/indikator/:konteksSasaranId/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO']}>
                        <KonteksSasaranIndikatorTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/indikator/:konteksSasaranId/edit/:indikatorId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KonteksSasaranIndikatorEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-sasaran/indikator/:konteksSasaranId/detail/:indikatorId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksSasaranIndikatorDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/konteks-probis",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksProbisIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-probis/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KonteksProbisTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-probis/edit/:konteksProbisId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KonteksProbisEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/konteks-probis/detail/:konteksProbisId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KonteksProbisDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/kamus-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KamusRisiko />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kamus-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO']}>
                        <KamusRisikoTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kamus-risiko/edit/:kamusRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KamusRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/kamus-risiko/detail/:kamusRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PEGAWAI', 'PENGAWAS_INTERN', 'UNIT_MANAJEMEN_RISIKO']}>
                        <KamusRisikoDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/approval/kamus-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KamusRisikoApprovalIndex />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/bagan-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <BaganRisikoIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/bagan-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <BaganRisikoTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/bagan-risiko/edit/:baganRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <BaganRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/parameters/bagan-risiko/detail/:baganRisikoId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <BaganRisikoDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/parameters/metode-spip",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <MetodeSpipIndex />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/pengelolaan-risiko/identifikasi-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <IdentifikasiRisikoIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <IdentifikasiRisikoTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/edit",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <IdentifikasiRisikoEditIden />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <IdentifikasiRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <IdentifikasiRisikoDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/detail",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <IdentifikasiRisikoDetailIden />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/inherent",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <AnalisisInherent />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/inherent",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <AnalisisInherentEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/residual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <AnalisisResidual />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/residual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <AnalisisResidualEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/treated",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <AnalisisTreated />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/treated",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <AnalisisTreatedEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/actual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <AnalisisActual />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/actual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <AnalisisActualEdit />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/existing-control",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <AnalisisExistingControl />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/existing-control",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <AnalisisExistingControlEdit />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/rtp",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoRtpIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/rtp/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoRtpTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/rtp/edit/:rtpId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoRtpEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/rtp/realisasi/:rtpId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoRtpRealisasi />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/rtp/detail/:rtpId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoRtpDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/rtp",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisikoRtpDetailIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/rtp/edit/:rtpId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisikoRtpEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/rtp/detail/:rtpId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisikoRtpDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/pengelolaan-risiko/registrasi-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <RegisterRisiko />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <RegisterRisikoTambah />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:identifikasiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <RegisterRisikoDetail />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:identifikasiId/edit",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <RegisterRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:idIdentifikasiRisiko/inherent",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <InherentRisk />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:idIdentifikasiRisiko/residual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <ResidualRisk />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:idIdentifikasiRisiko/treated",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <TreatedlRisk />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/registrasi-risiko/:idIdentifikasiRisiko/actual",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <ActualRisk />
                    </ProtectedRoute>
                )
            },

            {
                path: "/pengendalian-risiko/evaluasi-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisiko />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/edit/:identifikasiId/evaluasi-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN']}>
                        <EvaluasiRisikoTambah />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/identifikasi-risiko/detail/:identifikasiId/evaluasi-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisikoDetail />
                    </ProtectedRoute>
                )
            },
            {
                path: "/pengelolaan-risiko/proses-akhir-tahun",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <ProsesAkhirTahun />
                    </ProtectedRoute>
                )
            },

            {
                path: "/pengendalian-risiko/evaluasi-risiko/:idIdentifikasiRisiko/edit",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <EvaluasiRisikoEdit />
                    </ProtectedRoute>
                )
            },

            {
                path: "/organisasi/instansi",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                        <Instansi />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/instansi/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                        <InstansiTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/instansi/detail/:instansiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                        <InstansiDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/instansi/edit/:instansiId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                        <InstansiEdit />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/organisasi/induk-unit-kerja",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <IndukUnitKerja />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/induk-unit-kerja/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <IndukUnitKerjaTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/induk-unit-kerja/edit/:indukUnitKerjaId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <IndukUnitKerjaEditContent />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/organisasi/induk-unit-kerja/detail/:indukUnitKerjaId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <IndukUnitKerjaDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/kriteria-risiko/kemungkinan",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoKemungkinanIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/kemungkinan/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoKemungkinanTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/kemungkinan/edit/:kriteriaKemungkinanId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoKemungkinanEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/kemungkinan/detail/:kriteriaKemungkinanId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoKemungkinanDetail />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/dampak",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoDampakIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/dampak/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoDampakTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/dampak/edit/:kriteriaDampakId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <KriteriaRisikoDampakEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/kriteria-risiko/dampak/detail/:kriteriaDampakId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN']}>
                        <KriteriaRisikoDampakDetail />
                    </ProtectedRoute>
                ),
            },

            {
                path: "/settings-unit-kerja/manajemen-pengguna",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <ManajemenPengguna />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/settings-unit-kerja/manajemen-pengguna/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <ManajemenPenggunaTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/settings-unit-kerja/manajemen-pengguna/edit/:userId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <ManajemenPenggunaEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/settings-unit-kerja/manajemen-pengguna/detail/:userId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <ManajemenPenggunaDetail />
                    </ProtectedRoute>
                ),
            },

            // Add Laporan Kejadian admin routes under approval menu
            {
                path: "/approval/laporan-kejadian",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PENGELOLA_RISIKO', 'PEMILIK_RISIKO']}>
                        <LaporanKejadianIndex />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/approval/laporan-kejadian/:laporanId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP', 'PENGELOLA_RISIKO', 'PEMILIK_RISIKO']}>
                        <LaporanKejadianDetail />
                    </ProtectedRoute>
                ),
            },

            // Add Monitoring Risiko routes
            {
                path: "/pengelolaan-risiko/monitoring-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <MonitoringRisiko />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/monitoring-risiko/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'PENGELOLA_RISIKO']}>
                        <MonitoringRisikoTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/monitoring-risiko/edit/:monitoringId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'PENGELOLA_RISIKO']}>
                        <MonitoringRisikoEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/pengelolaan-risiko/monitoring-risiko/:monitoringId",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <MonitoringRisikoDetail />
                    </ProtectedRoute>
                ),
            },

            // Add Pelaporan Risiko route
            {
                path: "/pengelolaan-risiko/pelaporan-risiko",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'UNIT_MANAJEMEN_RISIKO', 'PEMILIK_RISIKO', 'PENGELOLA_RISIKO', 'PENGAWAS_INTERN', 'PEGAWAI']}>
                        <PelaporanRisiko />
                    </ProtectedRoute>
                ),
            },

            // Notification History Router
            {
                path: "/notifications",
                element: (
                    <ProtectedRoute>
                        <NotificationsIndex />
                    </ProtectedRoute>
                ),
            },

            // Profile routes
            {
                path: "/profile/details",
                element: (
                    <ProtectedRoute>
                        <ProfileDetails />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/profile/edit",
                element: (
                    <ProtectedRoute>
                        <EditProfile />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/profile/change-password",
                element: (
                    <ProtectedRoute>
                        <ChangePassword />
                    </ProtectedRoute>
                ),
            },

            // Group Management routes
            {
                path: "/groups",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <GroupManagement />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/groups/tambah",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <GroupTambah />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/groups/edit/:id",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <GroupEdit />
                    </ProtectedRoute>
                ),
            },
            {
                path: "/groups/detail/:id",
                element: (
                    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'ADMIN_KLP']}>
                        <GroupDetail />
                    </ProtectedRoute>
                ),
            },
        ]
    },
    {
        path: "/",
        element: <LayoutAuth />,
        children: [
            {
                path: "/authentication/login",
                element: <Login />
            },
            // Add public route for anonymous incident reporting
            {
                path: "/laporan-kejadian/:referenceId",
                element: <LaporanKejadianForm />,
            },
            {
                path: '/error/404',
                element: <PageNotFound />,
            },
            {
                path: '*',
                element: <Navigate to="/error/404" />,
            },
        ]
    }
])