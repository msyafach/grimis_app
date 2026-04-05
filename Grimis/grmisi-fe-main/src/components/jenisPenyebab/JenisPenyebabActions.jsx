import { FiEdit3, FiEye, FiTrash2 } from "react-icons/fi";

const getJenisPenyebabActions = (userRole) => {
  const baseActions = [
    { label: "Detil Data", key: "view", icon: <FiEye /> },
    { label: "Ubah Data", key: "edit", icon: <FiEdit3 /> },
  ];

  // Only SUPER_ADMIN can delete
  if (userRole === "SUPER_ADMIN") {
    baseActions.push({
      label: "Hapus Data",
      key: "delete",
      icon: <FiTrash2 />,
    });
  }

  return baseActions;
};

export default getJenisPenyebabActions;
