import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import actions from './Actions';


export const getColumns = (handleActionClick, user) => {
    const isPegawaiOrPengawas = user?.role !== "PEGAWAI" && user?.role !== "PENGAWAS_INTERN";
    const columns = [
        isPegawaiOrPengawas && {
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
            accessorKey: 'nama_depan',
            header: () => 'Nama Depan',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'nama_belakang',
            header: () => 'Nama Belakang',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'role',
            header: () => 'Peran',
            cell: (info) => <span>{info.getValue()}</span>,
        }
    ];
    return columns.filter(Boolean);
};