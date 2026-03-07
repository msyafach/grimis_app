import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import actions from './IndikatorActions';

export const getIndikatorColumns = (handleActionClick, user) => [
    {
        accessorKey: 'tindakan',
        header: () => 'Tindakan',
        cell: (info) => {
            const row = info.row.original;
            const handleClick = (key) => () => handleActionClick(key, row);

            return (
                <div className="d-flex justify-content-center gap-2">
                    <Dropdown
                        dropdownItems={actions
                            .filter(item => {
                                if (item.key === "delete") return user?.role === "SUPER_ADMIN";
                                if (["PEGAWAI", "PENGAWAS_INTERN"].includes(user?.role)) {
                                    return ["view", "setting"].includes(item.key);
                                }
                                return true;
                            })
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
        accessorKey: 'kode',
        header: () => 'Kode Konteks',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'nama',
        header: () => 'Nama',
        cell: (info) => <span>{info.getValue()}</span>,
    },
];

