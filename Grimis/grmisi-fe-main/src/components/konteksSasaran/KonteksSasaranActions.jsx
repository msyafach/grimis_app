import { FiToggleRight, FiToggleLeft, FiSettings, FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';

const konteksSasaranActions = [
    { label: "Kelola Indikator", key: "setting", icon: <FiSettings /> },
    { label: "Lihat Detail", key: "view", icon: <FiEye /> },
    { label: "Edit", key: "edit", icon: <FiEdit3 /> },
    { label: "Hapus", key: "delete", icon: <FiTrash2 /> },
    {
        key: 'disable',
        label: 'Nonaktifkan',
        icon: <FiToggleRight />
    },
    {
        key: 'enable',
        label: 'Aktifkan',
        icon: <FiToggleLeft />
    },
];

export default konteksSasaranActions;
