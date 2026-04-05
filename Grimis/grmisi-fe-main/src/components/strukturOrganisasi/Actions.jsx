import { FiUsers, FiEdit3, FiEye, FiTrash2 } from "react-icons/fi";

const Actions = [
  { label: "Pengaturan Pengguna", key: "setting", icon: <FiUsers /> },
  { label: "Detil Data", key: "view", icon: <FiEye /> },
  { label: "Ubah Data", key: "edit", icon: <FiEdit3 /> },
  { label: "Hapus Data", key: "delete", icon: <FiTrash2 /> },
];

export default Actions;
