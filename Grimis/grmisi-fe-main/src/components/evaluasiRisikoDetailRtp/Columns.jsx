import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import { formatDateWIB } from '@/utils/date';
import actions from './Actions';

export const getColumns = (handleActionClick) => [
    {
        accessorKey: 'tindakan',
        header: () => 'Aksi',
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
        id: 'deskripsi_evaluasi',
        header: 'Akar Penyebab',
        cell: (info) => {
            const { evaluasi_risiko_detail, rowSpan } = info.row.original;
            if (rowSpan > 0) {
                return <td rowSpan={rowSpan} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{evaluasi_risiko_detail?.deskripsi}</td>;
            }
            return null;
        },
    },
    {
        accessorKey: 'rencana_aksi',
        header: () => 'Rencana Aksi',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'pic',
        header: () => 'PIC',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'indikator',
        header: () => 'Indikator',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'output',
        header: () => 'Output',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'anggaran',
        header: () => 'Anggaran',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'target_waktu',
        header: () => 'Target Waktu',
        cell: (info) => {
            const { created_at, updated_at } = info.row.original;
            const dateToShow = updated_at || created_at;
            return <span>{formatDateWIB(dateToShow)}</span>;
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
            const { target_waktu, tanggal_realisasi } = info.row.original;
            const statusClass = target_waktu && tanggal_realisasi
                ? (() => {
                    const targetDate = new Date(target_waktu);
                    const realisasiDate = new Date(tanggal_realisasi);
                    const isLate = realisasiDate > targetDate;
                    if (isLate) {
                        return 'bg-warning text-white';
                    } else if (realisasiDate <= targetDate) {
                        return 'bg-success text-white';
                    }
                    return 'bg-danger text-white';
                })()
                : 'bg-danger text-white';
            const statusText = target_waktu && tanggal_realisasi
                ? (() => {
                    const targetDate = new Date(target_waktu);
                    const realisasiDate = new Date(tanggal_realisasi);
                    const isLate = realisasiDate > targetDate;

                    if (isLate) {
                        return 'Terlambat';
                    } else if (realisasiDate <= targetDate) {
                        return 'Tepat Waktu';
                    }
                    return 'Belum Terealisasi';
                })()
                : 'Belum Terealisasi';
            return (
                <span className={`badge rounded-3 ${statusClass}`}>
                    {statusText}
                </span>
            );
        },
    },
];

