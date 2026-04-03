import { FiUsers, FiEye, FiEdit3, FiTrash2 } from "react-icons/fi";
import { Button } from "react-bootstrap";

export const getColumns = (handleActionClick, user) => [
  {
    accessorKey: "kode",
    header: () => "Kode",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "nama_induk_unit",
    header: () => "Induk Unit Kerja",
    cell: (info) => {
      const value = info.getValue();
      return <span>{value ? value : "-"}</span>;
    },
  },
  {
    accessorKey: "nama",
    header: () => "Nama Unit Kerja",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "jenis",
    header: () => "Jenis",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "pimpinan",
    header: () => "Pimpinan",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "jabatan_pimpinan",
    header: () => "Jabatan Pimpinan",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "provinsi",
    header: () => "Provinsi",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "kota",
    header: () => "Kota / Kabupaten",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "tindakan",
    header: () => "Tindakan",
    cell: (info) => {
      const row = info.row.original;
      const isAdmin =
        user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
      const isReadOnlySetting = [
        "PEGAWAI",
        "PENGAWAS_INTERN",
        "UNIT_MANAJEMEN_RISIKO",
      ].includes(user?.role);

      return (
        <div className="d-flex gap-1 justify-content-center">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleActionClick("setting", row)}
            title={isReadOnlySetting ? "Lihat Pengguna" : "Pengaturan Pengguna"}
          >
            <FiUsers size={14} />
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            onClick={() => handleActionClick("view", row)}
            title="Detil Data"
          >
            <FiEye size={14} />
          </Button>
          {!isReadOnlySetting && (
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => handleActionClick("edit", row)}
              title="Ubah Data"
            >
              <FiEdit3 size={14} />
            </Button>
          )}
          {user?.role === "SUPER_ADMIN" && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleActionClick("delete", row)}
              title="Hapus Data"
            >
              <FiTrash2 size={14} />
            </Button>
          )}
        </div>
      );
    },
    meta: {
      className: "text-center",
    },
  },
];
