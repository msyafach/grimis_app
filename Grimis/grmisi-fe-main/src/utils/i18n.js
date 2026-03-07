const translations = {
    en: {
        "Code already exists for this institution": "Kode sudah terdaftar untuk institusi ini",
        "Institution not found": "Institusi tidak ditemukan",
        "Parent work unit not found": "Unit kerja induk tidak ditemukan",
        "Parent organization with code": "Organisasi induk dengan kode tersebut tidak ditemukan",
        "Not enough permissions": "Anda tidak memiliki izin",
        "Invalid token": "Token tidak valid",
        "Unauthorized": "Tidak diizinkan",
        "Terjadi kesalahan.": "Terjadi kesalahan. Silakan coba lagi.",
    },
    id: {
        "Code already exists for this institution": "Kode sudah terdaftar untuk institusi ini",
        "Institution not found": "Institusi tidak ditemukan",
        "Parent work unit not found": "Unit kerja induk tidak ditemukan",
        "Parent organization with code": "Organisasi induk dengan kode tersebut tidak ditemukan",
        "Not enough permissions": "Anda tidak memiliki izin",
        "Invalid token": "Token tidak valid",
        "Unauthorized": "Tidak diizinkan",
        "Terjadi kesalahan.": "Terjadi kesalahan. Silakan coba lagi.",
    }
};

// Current language setting (default 'id' / Indonesia)
let currentLanguage = 'id';

export const setLanguage = (lang) => {
    currentLanguage = lang;
};

export const translate = (message) => {
    if (!message) return translations[currentLanguage]["Terjadi kesalahan."];

    const dictionary = translations[currentLanguage];

    // Cari terjemahan persis
    if (dictionary[message]) {
        return dictionary[message];
    }

    // Cek berdasarkan contain string
    if (message.includes("Parent organization with code")) {
        return dictionary["Parent organization with code"];
    }

    // Kalau tidak ditemukan, tampilkan original message
    return message;
};
