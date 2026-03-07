import { useLanguage } from '../context/LanguageContext';

const translations = {
    id: {
        "Unauthorized": "Tidak diizinkan",
        "Invalid token": "Token tidak valid",
        "Code already exists for this institution": "Kode sudah terdaftar untuk institusi ini",
        "Institution not found": "Institusi tidak ditemukan",
        "Parent work unit not found": "Unit kerja induk tidak ditemukan",
        "Parent organization with code": "Organisasi induk dengan kode tersebut tidak ditemukan",
        "Not enough permissions": "Anda tidak memiliki izin",
        "Terjadi kesalahan.": "Terjadi kesalahan. Silakan coba lagi.",
    },
    en: {
        "Unauthorized": "Unauthorized",
        "Invalid token": "Invalid token",
        "Code already exists for this institution": "Code already exists for this institution",
        "Institution not found": "Institution not found",
        "Parent work unit not found": "Parent work unit not found",
        "Parent organization with code": "Parent organization with code not found",
        "Not enough permissions": "You do not have permission",
        "Terjadi kesalahan.": "An error occurred. Please try again.",
    }
};

export const useTranslate = () => {
    const { language } = useLanguage();
    const dictionary = translations[language] || translations.id;

    return (message) => {
        if (!message) return dictionary["Terjadi kesalahan."];
        if (dictionary[message]) return dictionary[message];
        if (message.includes("Parent organization with code")) return dictionary["Parent organization with code"];
        return message;
    };
};
