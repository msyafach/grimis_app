import { FiMoreHorizontal } from "react-icons/fi";
import Dropdown from "@/components/shared/Dropdown";
import { formatDateWIB } from "@/utils/date";
import actions from "./Actions";

export const getColumns = (handleActionClick) => [
  {
    accessorKey: "tindakan",
    header: () => "Tindakan",
    cell: (info) => {
      const row = info.row.original;

      const handleClick = (key) => () => handleActionClick(key, row);

      return (
        <div className="d-flex justify-content-center gap-2">
          <Dropdown
            dropdownItems={actions.map((item) => ({
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
    accessorKey: "nama_instansi",
    header: () => "Nama Instansi",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "kode_instansi",
    header: () => "Kode Instansi",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "jenis",
    header: () => "Jenis",
    cell: (info) => <span>{info.getValue()}</span>,
  },
  {
    accessorKey: "email",
    header: () => "Email",
    cell: (info) => <a href={`mailto:${info.getValue()}`}>{info.getValue()}</a>,
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
