import { FiDownload } from 'react-icons/fi';

const formatControlType = (type) => {
    switch (type) {
        case 'PENGENDALIAN_FISIK':
            return 'Pengendalian Fisik';
        case 'PENGENDALIAN_DOKUMEN':
            return 'Pengendalian Dokumen';
        case 'PENGENDALIAN_APLIKASI':
            return 'Pengendalian Aplikasi';
        default:
            return type;
    }
};

export const getColumns = (handleActionClick) => [
    {
        accessorKey: 'file_name',
        header: () => 'Judul Berkas',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'type',
        header: () => 'Jenis Pengendalian',
        cell: (info) => <span>{formatControlType(info.getValue())}</span>,
    },
    {
        accessorKey: 'deskripsi',
        header: () => 'Deskripsi',
        cell: (info) => <span>{info.getValue() || '-'}</span>,
    },
    {
        accessorKey: 'content_type',
        header: () => 'Format File',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'tindakan',
        header: () => 'Tindakan',
        cell: (info) => {
            const row = info.row.original;

            return (
                <div className="d-flex justify-content-center gap-2">
                    <button
                        type="button"
                        className="btn btn-md btn-primary"
                        onClick={() => handleActionClick('download', row)}
                    >
                        <FiDownload size={16} />
                    </button>
                </div>
            );
        },
        meta: {
            headerClassName: 'text-center',
        },
    },
];
