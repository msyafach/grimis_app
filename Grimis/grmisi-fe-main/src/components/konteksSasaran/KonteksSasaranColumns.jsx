import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import konteksSasaranActions from './KonteksSasaranActions';

export const getKonteksSasaranColumns = (handleActionClick, user, isDisabled = false) => {
    // Use the useAuth hook to get the current user
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isPegawaiOrPengawas = user?.role === 'PEGAWAI' || user?.role === 'PENGAWAS_INTERN';

    return [
        {
            accessorKey: 'tindakan',
            header: () => 'Tindakan',
            cell: (info) => {
                const row = info.row.original;
                const handleClick = (key) => () => handleActionClick(key, row);

                // Filter actions based on whether the context is disabled and user role
                const actions = konteksSasaranActions.filter(action => {
                    // PEGAWAI
                    if (user?.role === 'PEGAWAI' || user?.role === 'PENGAWAS_INTERN') {
                        return ['view', 'setting'].includes(action.key);
                    }

                    // Only show delete action to SUPER_ADMIN
                    if (action.key === 'delete' && !isSuperAdmin) {
                        return false;
                    }

                    if (isDisabled) {
                        // For disabled contexts, show enable action but not disable action
                        // Also allow Kelola Indikator (setting) for disabled contexts
                        return action.key !== 'disable';
                    } else {
                        // For enabled contexts, show disable action but not enable action
                        return action.key !== 'enable';
                    }
                }).map(action => {
                    let newLabel = action.label;
                    switch (action.key) {
                        case 'setting':
                            newLabel = isPegawaiOrPengawas ? 'Lihat Indikator' : 'Kelola Indikator';
                            break;
                        case 'view':
                            newLabel = 'Lihat Detail';
                            break;
                        case 'edit':
                            newLabel = 'Edit Konteks';
                            break;
                        case 'delete':
                            newLabel = 'Hapus Konteks';
                            break;
                        case 'enable':
                            newLabel = 'Aktifkan Konteks';
                            break;
                        case 'disable':
                            newLabel = 'Nonaktifkan Konteks';
                            break;
                        default:
                            break;
                    }
                    return { ...action, label: newLabel };
                });

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
        {
            accessorKey: 'total_indikator',
            header: () => 'Total Indikator',
            cell: (info) => <span>{info.getValue()}</span>,
        },
    ];
};

