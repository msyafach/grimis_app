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
        accessorKey: 'pernyataan_risiko',
        header: () => 'Pernyataan Risiko',
        cell: (info) => {
            const row = info.row.original;
            return (
                <div className="d-flex flex-column">
                    <span className="fw-semibold">{row.pernyataan_risiko}</span>
                    <span className="text-muted small">{row.uraian_dampak}</span>
                </div>
            );
        }
    },
    {
        accessorKey: 'created_by_name',
        header: () => 'Diusulkan Oleh',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'catatan',
        header: () => 'Deskripsi',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'status',
        header: () => 'Status',
        cell: (info) => {
            const value = info.getValue();
            const badgeColors = {
                DRAFT: 'bg-secondary text-white',
                SUBMITTED: 'bg-info text-white',
                VERIFIED: 'bg-primary text-white',
                REJECTED: 'bg-danger text-white',
                APPROVED_WITH_ADJUSTMENT: 'bg-warning text-dark',
                APPROVED: 'bg-success text-white',
            };

            const badgeClass = badgeColors[value] || 'bg-light text-dark';

            return (
                <span className={`badge ${badgeClass} p-2 rounded-3`}>
                    {value || '-'}
                </span>
            );
        },
    },
    {
        accessorKey: 'created_at',
        header: () => 'Tanggal',
        cell: (info) => {
            const { created_at, updated_at } = info.row.original;
            const dateToShow = updated_at || created_at;
            return <span>{formatDateWIB(dateToShow)}</span>;
        },
    },
];

