import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import actions from './IdentifikasiRisikoActions';

export const getIdentifikasiRisikoColumns = (handleActionClick, user) => [
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
                            .filter(item =>
                                !["PEGAWAI", "PENGAWAS_INTERN"].includes(user?.role) || item.key === "detail"
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
        accessorKey: 'pernyataan_risiko',
        header: () => 'Pernyataan Risiko',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'level_risiko_inherit',
        header: () => 'Inherent Risk',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'level_risiko_residual',
        header: () => 'Residual Risk',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'level_risiko_treated',
        header: () => 'Treated Risk',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'level_risiko_actual',
        header: () => 'Actual',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'attachment_count',
        header: () => 'Exiting Control',
        cell: (info) => <span>{info.getValue() || 0}</span>,
    },
    {
        accessorKey: 'rtp_count',
        header: () => 'Risk Treatment Plan (RTP)',
        cell: (info) => <span>{info.getValue() || 0}</span>,
    },
];

