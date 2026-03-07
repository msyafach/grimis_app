import { FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';

const getKamusRisikoActions = (userRole) => {
    const baseActions = [
        { label: "Lihat Detail", key: "view", icon: <FiEye /> },
        { label: "Edit", key: "edit", icon: <FiEdit3 /> },
    ];
    
    // Only SUPER_ADMIN can delete
    if (userRole === "SUPER_ADMIN") {
        baseActions.push({ label: "Hapus", key: "delete", icon: <FiTrash2 /> });
    }
    
    return baseActions;
};

export default getKamusRisikoActions;
