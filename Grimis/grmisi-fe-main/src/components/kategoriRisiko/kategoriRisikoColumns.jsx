import { FiMoreHorizontal } from "react-icons/fi";
import Dropdown from "@/components/shared/Dropdown";
import { formatDateWIB } from "@/utils/date";
import getKategoriRisikoActions from "./kategoriRisikoActions";

export const getKategoriRisikoColumns = (handleActionClick, user) => [
  {
    accessorKey: "tindakan",
    header: () => "Tindakan",
    cell: (info) => {
      const row = info.row.original;
      const handleClick = (key) => () => handleActionClick(key, row);

      // Get actions based on user role
      const actionItems = getKategoriRisikoActions(user?.role);

      return (
        <div className="d-flex justify-content-center gap-2">
          <Dropdown
            dropdownItems={actionItems
              .filter(
                (item) =>
                  !["PEGAWAI", "PENGAWAS_INTERN"].includes(user?.role) ||
                  item.key === "view",
              )
              .map((item) => ({
                ...item,
                onClick: handleClick(item.key),
              }))}
            triggerIcon={<FiMoreHorizontal />}
            triggerClass="avatar-md"
            triggerPosition="0,21"
            dropdownPosition="dropdown-menu-start"
          />
        </div>
      );
    },
    meta: {
      headerClassName: "text-end",
    },
  },
  {
    accessorKey: "kode",
    header: () => "Kode",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "nama_klp",
    header: () => "Nama KLP",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "nama",
    header: () => "Nama",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "created_at",
    header: () => "Terakhir Diperbaharui",
    cell: (info) => {
      const { created_at, updated_at } = info.row.original;
      const dateToShow = updated_at || created_at;
      return <span>{formatDateWIB(dateToShow)}</span>;
    },
  },
];
