import { FiUsers, FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';

const Actions = [
    { label: "Pengaturan Pengguna", key: "setting", icon: <FiUsers /> },
    { label: "Lihat Detail", key: "view", icon: <FiEye /> },
    { label: "Edit", key: "edit", icon: <FiEdit3 /> },
    { label: "Hapus", key: "delete", icon: <FiTrash2 /> },
];

export default Actions;
