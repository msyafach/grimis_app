import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import { formatDateWIB } from '@/utils/date';
import actions from './Actions';

export const getColumns = (handleActionClick) => [
    {
        accessorKey: 'tindakan',
        header: () => 'Tindakan',
        cell: (info) => {
            const row = info.row.original;

            const handleClick = (key) => () => handleActionClick(key, row);

            return (
                <div className="d-flex justify-content-center gap-2">
                    <Dropdown
                        dropdownItems={actions.map((item) => ({
                            ...item,
                            onClick: handleClick(item.key)
                        }))}
                        triggerIcon={<FiMoreHorizontal />}
                        triggerClass="avatar-md"
                        triggerPosition="0,21"
                    />
                </div>
            );
        },
        meta: {
            headerClassName: 'text-end',
        },
    },
    {
        accessorKey: 'parent_kode_induk',
        header: () => 'Kode Induk',
        cell: (info) => {
            const value = info.getValue();
            return <span>{value === null ? '-' : value}</span>;
        },
    },
    {
        accessorKey: 'name',
        header: () => 'Nama Induk',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'kode_induk',
        header: () => 'Kode',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'nama_induk_unit',
        header: () => 'Nama',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'created_at',
        header: () => 'Terakhir Diperbaharui',
        cell: (info) => {
            const { created_at, updated_at } = info.row.original;
            const dateToShow = updated_at || created_at;
            return <span>{formatDateWIB(dateToShow)}</span>;
        },
    },
];

