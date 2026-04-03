export const menuList = [
  {
    id: 0,
    name: "dashboards",
    path: "#",
    icon: "feather-grid",
    dropdownMenu: [
      {
        id: 1,
        name: "Peta Risiko",
        path: "/",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 1,
    name: "organisasi",
    path: "#",
    icon: "feather-layers",
    dropdownMenu: [
      {
        id: 1,
        name: "Instansi",
        path: "/organisasi/instansi",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Induk Unit Kerja",
        path: "/organisasi/induk-unit-kerja",
        subdropdownMenu: false,
      },
      {
        id: 3,
        name: "Pengaturan Kop Surat",
        path: "/pengaturan/kop-surat",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 2,
    name: "parameters",
    path: "#",
    icon: "feather-cast",
    dropdownMenu: [
      // Admin only items
      {
        id: 1,
        name: "Setting Matriks Risiko",
        path: "/parameters/setting-matriks-risiko",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Pengisian Kategori dan Kriteria Risiko",
        path: "/parameters/pengisian-kategori-kriteria-frekuensi",
        subdropdownMenu: false,
      },
      {
        id: 3,
        name: "Pengisian Kategori dan Kriteria Dampak",
        path: "/parameters/pengisian-kategori-kriteria-dampak",
        subdropdownMenu: false,
      },
      {
        id: 4,
        name: "Struktur Organisasi",
        path: "/parameters/struktur-organisasi",
        subdropdownMenu: false,
      },
      {
        id: 5,
        name: "Pemilihan Warna Matriks Risiko",
        path: "/parameters/pemilihan-warna-matriks",
        subdropdownMenu: false,
      },
      {
        id: 6,
        name: "Jenis Penyebab",
        path: "/parameters/jenis-penyebab",
        subdropdownMenu: false,
      },
      {
        id: 7,
        name: "Kategori Risiko",
        path: "/parameters/kategori-risiko",
        subdropdownMenu: false,
      },
      {
        id: 8,
        name: "Jenis Konteks",
        path: "/parameters/jenis-konteks",
        subdropdownMenu: false,
      },
      {
        id: 9,
        name: "Kamus Risiko",
        path: "/parameters/kamus-risiko",
        subdropdownMenu: false,
      },
      {
        id: 10,
        name: "Konteks",
        path: "/parameters/konteks",
        subdropdownMenu: false,
      },
      // Non-admin items
      {
        id: 11,
        name: "Usulan Kamus",
        path: "/parameters/usulan-kamus-risiko",
        subdropdownMenu: false,
      },
      {
        id: 12,
        name: "Usulan Konteks",
        path: "/parameters/konteks", // Menggunakan halaman konteks yang ada
        subdropdownMenu: false,
      },
      {
        id: 13,
        name: "Usulan Indikator",
        path: "/parameters/usulan-indikator",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 3,
    name: "kriteria-risiko",
    path: "#",
    icon: "feather-sliders",
    dropdownMenu: [
      {
        id: 1,
        name: "Kemungkinan",
        path: "/kriteria-risiko/kemungkinan",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Dampak",
        path: "/kriteria-risiko/dampak",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 4,
    name: "pengelolaan-risiko",
    path: "#",
    icon: "feather-airplay",
    dropdownMenu: [
      {
        id: 1,
        name: "Identifikasi Risiko",
        path: "/pengelolaan-risiko/identifikasi-risiko",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Monitoring Risiko",
        path: "/pengelolaan-risiko/monitoring-risiko",
        subdropdownMenu: false,
      },
      {
        id: 3,
        name: "Pelaporan Risiko",
        path: "/pengelolaan-risiko/pelaporan-risiko",
        subdropdownMenu: false,
      },
      {
        id: 4,
        name: "Proses Akhir Tahun",
        path: "/pengelolaan-risiko/proses-akhir-tahun",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 5,
    name: "settings-unit-kerja",
    path: "#",
    icon: "feather-users",
    dropdownMenu: [
      {
        id: 1,
        name: "Manajemen Pengguna",
        path: "/settings-unit-kerja/manajemen-pengguna",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Manajemen Group",
        path: "/settings/group-management",
        subdropdownMenu: false,
      },
      {
        id: 3,
        name: "Manajemen Role",
        path: "/settings/role-management",
        subdropdownMenu: false,
      },
    ],
  },
  {
    id: 6,
    name: "approval",
    path: "#",
    icon: "feather-check-circle",
    dropdownMenu: [
      {
        id: 1,
        name: "Approval Kejadian",
        path: "/approval/laporan-kejadian",
        subdropdownMenu: false,
      },
      {
        id: 2,
        name: "Approval Kamus Risiko",
        path: "/approval/kamus-risiko",
        subdropdownMenu: false,
      },
    ],
  },
];
