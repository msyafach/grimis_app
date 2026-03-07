export const menuList = [
    {
        id: 0,
        name: "dashboards",
        path: "#",
        icon: 'feather-grid',
        dropdownMenu: [
            {
                id: 1,
                name: "Peta Risiko",
                path: "/",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 1,
        name: "parameters",
        path: "#",
        icon: 'feather-cast',
        dropdownMenu: [
            {
                id: 1,
                name: "Struktur Organisasi",
                path: "/parameters/struktur-organisasi",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Kategori Risiko",
                path: "/parameters/kategori-risiko",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Jenis Penyebab",
                path: "/parameters/jenis-penyebab",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Konteks Sasaran",
                path: "/parameters/konteks-sasaran",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Konteks Probis",
                path: "/parameters/konteks-probis",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Kamus Risiko",
                path: "/parameters/kamus-risiko",
                subdropdownMenu: false
            },

        ]
    },
    {
        id: 2,
        name: "pengelolaan-risiko",
        path: '#',
        icon: 'feather-airplay',
        dropdownMenu: [
            {
                id: 1,
                name: "Identifikasi Risiko",
                path: "/pengelolaan-risiko/identifikasi-risiko",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Analisis Risiko",
                path: "/pengelolaan-risiko/analisis-risiko",
                subdropdownMenu: false
            },
            {
                id: 3,
                name: "Evaluasi Risiko",
                path: "/pengelolaan-risiko/evaluasi-risiko",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Respon Risiko (RTP)",
                path: "/pengelolaan-risiko/respon-risiko",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Treated Risk",
                path: "/pengelolaan-risiko/treated-risk",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Monitoring Risiko",
                path: "/pengelolaan-risiko/monitoring-risiko",
                subdropdownMenu: false
            },
            {
                id: 7,
                name: "Pelaporan Risiko",
                path: "/pengelolaan-risiko/pelaporan-risiko",
                subdropdownMenu: false
            },
            {
                id: 8,
                name: "Buku Tutup PAT",
                path: "/pengelolaan-risiko/buku-tutup-pat",
                subdropdownMenu: false
            },
            {
                id: 9,
                name: "Proses Akhir Tahun",
                path: "/pengelolaan-risiko/proses-akhir-tahun",
                subdropdownMenu: false
            },
            {
                id: 10,
                name: "Proses Nilai Aktual",
                path: "/pengelolaan-risiko/proses-nilai-aktual",
                subdropdownMenu: false
            },
        ]
    },
    {
        id: 3,
        name: "settings-unit-kerja",
        path: "#",
        icon: 'feather-users',
        dropdownMenu: [
            {
                id: 1,
                name: "Manajemen Pengguna",
                path: "/settings-unit-kerja/manajemen-pengguna",
                subdropdownMenu: false
            }
        ],
    },
    {
        id: 4,
        name: "approval",
        path: "#",
        icon: 'feather-check-circle',
        dropdownMenu: [
            {
                id: 1,
                name: "Pindah Unit Kerja",
                path: "/approval/pindah-unit-kerja",
                subdropdownMenu: false
            },
            {
                id: 2,
                name: "Kejadian",
                path: "/approval/kejadian",
                subdropdownMenu: false
            },
            {
                id: 4,
                name: "Kamus Risiko",
                path: "/approval/kamus-risiko",
                subdropdownMenu: false
            },
            {
                id: 5,
                name: "Identifikasi Risiko",
                path: "/approval/identifikasi-risiko",
                subdropdownMenu: false
            },
            {
                id: 6,
                name: "Konteks",
                path: "/approval/konteks",
                subdropdownMenu: false
            },
            {
                id: 7,
                name: "Indikator",
                path: "/approval/indikator",
                subdropdownMenu: false
            }
        ]
    }
]
