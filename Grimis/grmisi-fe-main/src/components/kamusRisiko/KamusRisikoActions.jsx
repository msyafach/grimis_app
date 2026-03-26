import { FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';

const getKamusRisikoActions = (userRole) => {
    const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN_KLP";

    // Base action: View (available to all)
    const baseActions = [
        { label: "Lihat Detail", key: "view", icon: <FiEye /> },
    ];

    // Edit only for Admin
    if (isAdmin) {
        baseActions.push({ label: "Edit", key: "edit", icon: <FiEdit3 /> });
    }

    // Delete only for SUPER_ADMIN
    if (userRole === "SUPER_ADMIN") {
        baseActions.push({ label: "Hapus", key: "delete", icon: <FiTrash2 /> });
    }

    return baseActions;
};

export default getKamusRisikoActions;
