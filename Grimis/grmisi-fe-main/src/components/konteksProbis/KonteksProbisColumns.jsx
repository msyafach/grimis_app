import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import getKonteksProbisActions from './KonteksProbisActions';

export const getKonteksProbisColumns = (handleActionClick, user) => [
    {
        accessorKey: 'tindakan',
        header: () => 'Tindakan',
        cell: (info) => {
            const row = info.row.original;
            const handleClick = (key) => () => handleActionClick(key, row);
            
            // Get actions based on user role
            const actionItems = getKonteksProbisActions(user?.role);

            return (
                <div className="d-flex justify-content-center gap-2">
                    <Dropdown
                        dropdownItems={actionItems
                            .filter(item =>
                                !["PEGAWAI", "PENGAWAS_INTERN"].includes(user?.role) || item.key === "view"
                            )
                            .map((item) => ({
                                ...item,
                                onClick: handleClick(item.key)
                            }))
                        }
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
        accessorKey: 'nama_klp',
        header: () => 'Nama KLP',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'nama_jenis_konteks',
        header: () => 'Jenis Konteks',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'kode',
        header: () => 'Kode Konteks',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'nama',
        header: () => 'Nama Konteks',
        cell: (info) => <span>{info.getValue()}</span>,
    },
];

