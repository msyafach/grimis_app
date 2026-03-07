import { FiEdit3, FiEye, FiTrash2, FiCheckCircle } from 'react-icons/fi';

const Actions = [
    { label: "Realisasi", key: "realisasi", icon: <FiCheckCircle /> },
    { label: "Lihat Detail", key: "view", icon: <FiEye /> },
    { label: "Edit", key: "edit", icon: <FiEdit3 /> },
    { label: "Hapus", key: "delete", icon: <FiTrash2 /> },
];

export default Actions;
