import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import actions from './Actions';

export const getColumns = (handleActionClick, user) => [
    {
        accessorKey: 'tindakan',
        header: () => 'Tindakan',
        cell: (info) => {
            const row = info.row.original;
            const handleClick = (key) => () => handleActionClick(key, row);
            const isReadOnlySetting = ["PEGAWAI", "PENGAWAS_INTERN", "UNIT_MANAJEMEN_RISIKO"].includes(user?.role);

            return (
                <div className="d-flex justify-content-center gap-2">
                    <Dropdown
                        dropdownItems={actions
                            .filter(item => {
                                if (item.key === "delete") return user?.role === "SUPER_ADMIN";
                                if (["PEGAWAI", "PENGAWAS_INTERN", "UNIT_MANAJEMEN_RISIKO"].includes(user?.role)) {
                                    return ["view", "setting"].includes(item.key);
                                }
                                return true;
                            })
                            .map((item) => {
                                let adjustedLabel = item.label;

                                if (item.key === "setting" && isReadOnlySetting) {
                                    adjustedLabel = "Lihat Pengguna";
                                }

                                return {
                                    ...item,
                                    label: adjustedLabel,
                                    onClick: handleClick(item.key),
                                };
                            })
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
        accessorKey: 'kode_induk',
        header: () => 'Kode Induk Unit Kerja',
        cell: (info) => {
            const value = info.getValue();
            return <span>{value ? value : '-'}</span>;
        },
    },
    {
        accessorKey: 'kode',
        header: () => 'Kode',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'nama',
        header: () => 'Nama Unit Kerja',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'jenis',
        header: () => 'Jenis',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'pimpinan',
        header: () => 'Pimpinan',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'jabatan_pimpinan',
        header: () => 'Jabatan Pimpinan',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'provinsi',
        header: () => 'Provinsi',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'kota',
        header: () => 'Kota / Kabupaten',
        cell: (info) => <span>{info.getValue()}</span>,
    },
];

