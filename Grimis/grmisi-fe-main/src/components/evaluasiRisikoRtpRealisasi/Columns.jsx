import { FiTrash2, FiDownload } from 'react-icons/fi';

export const getColumns = (handleActionClick) => [
    {
        accessorKey: 'file_name',
        header: () => 'Judul Berkas',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'content_type',
        header: () => 'Jenis Berkas',
        cell: (info) => <span>{info.getValue()}</span>,
    },
    {
        accessorKey: 'type',
        header: () => 'Jenis',
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
                    <button
                        type="button"
                        className="btn btn-md btn-danger"
                        onClick={() => handleActionClick('delete', row)}
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            );
        },
        meta: {
            headerClassName: 'text-center',
        },
    },
];
