import { FiEye, FiTrash2 } from "react-icons/fi";
import { Button } from "react-bootstrap";

export const getColumns = (handleActionClick, user) => {
  const isPegawaiOrPengawas =
    user?.role !== "PEGAWAI" && user?.role !== "PENGAWAS_INTERN";
  const columns = [
    {
      accessorKey: "nama",
      header: () => "Nama",
      cell: (info) => {
        const row = info.row.original;
        return (
          <span>
            {row.nama_depan} {row.nama_belakang}
          </span>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => "Email",
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: "assigned_at",
      header: () => "Terakhir Diperbarui",
      cell: (info) => {
        const val = info.getValue();
        if (!val) return <span>-</span>;
        try {
          return <span>{new Date(val).toLocaleString("id-ID")}</span>;
        } catch (e) {
          return <span>{val}</span>;
        }
      },
    },
    {
      accessorKey: "tindakan",
      header: () => "Tindakan",
      cell: (info) => {
        const row = info.row.original;

        return (
          <div className="d-flex justify-content-center gap-1">
            <Button
              variant="outline-info"
              size="sm"
              onClick={() => handleActionClick("view", row)}
              title="Detil Data"
            >
              <FiEye size={14} />
            </Button>
            {isPegawaiOrPengawas && (
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
  return columns.filter(Boolean);
};
