import PropTypes from 'prop-types';
import { FiSave, FiTrash2, FiRefreshCw, FiEdit, FiX, FiEye } from 'react-icons/fi';
import SelectDropdown from '../shared/SelectDropdown';
import { useState, useEffect } from 'react';
import TableEvaluasiAkarPenyebab from '../shared/table/TableEvaluasiAkarPenyebab';

const CardDaftarAkarPenyebab = ({
    title = "Daftar Akar Penyebab",
    dataJenisPenyebab,
    selectedEntries,
    generatedRootCausesEdit,
    tempEntries,
    onEditEntry,
    onRemoveEntry,
    onGenerateForEntry,
    onSaveEntry,
}) => {
    const [backupEntry, setBackupEntry] = useState(null);

    const jenisPenyebabOptions = dataJenisPenyebab.map(item => ({
        value: item.id,
        label: item.nama,
    }));

    const isSaveEnabled = (entry) => {
        return (
            entry.jenis_penyebab_id &&
            (entry.root_cause_id || entry.deskripsi?.trim() || entry.pengendalian?.trim())
        );
    };

    const handleEdit = (index) => {
        setBackupEntry({ ...selectedEntries[index] });
        onEditEntry(index, 'isEditing', true);
    };

    const handleSaveEntry = (index) => {
        onSaveEntry(index);
        onEditEntry(index, 'isEditing', false);
    };

    const handleCancel = (index) => {
        if (backupEntry) {
            Object.entries(backupEntry).forEach(([key, value]) => {
                onEditEntry(index, key, value);
            });
        }
        onEditEntry(index, 'isEditing', false);
    };

    const handleGenerate = (index) => {
        setBackupEntry({ ...selectedEntries[index] });
        onEditEntry(index, 'isEditing', true);
        onGenerateForEntry(index);
    };

    const columns = [
        {
            accessorKey: 'jenis_penyebab_id',
            header: 'Jenis Penyebab',
            cell: (info) => {
                const entry = info.row.original;
                const selectedOption = jenisPenyebabOptions.find(opt => String(opt.value) === String(entry.jenis_penyebab_id));
                return <span>{selectedOption?.label || '-'}</span>
            },
        },
        {
            accessorKey: 'deskripsi',
            header: 'Deskripsi',
            cell: (info) => <span>{info.row.original.deskripsi || '-'}</span>,
        },
        {
            accessorKey: 'jenis',
            header: 'Jenis',
            cell: (info) => <span>{info.row.original.jenis || '-'}</span>,
        },
        {
            accessorKey: 'pengendalian',
            header: 'Pengendalian',
            cell: (info) => <span>{info.row.original.pengendalian || '-'}</span>,
        },
        {
            accessorKey: 'jenis_pengendalian',
            header: 'Jenis Pengendalian',
            cell: (info) => <span>{info.row.original.jenis_pengendalian || '-'}</span>,
        },
        {
            accessorKey: 'rtp_count',
            header: 'RTP',
            cell: (info) => <span>{info.row.original.rtp_count || 0}</span>,
        },
        // {
        //     id: 'actions',
        //     header: 'Aksi',
        //     cell: (info) => {
        //         const entry = info.row.original;
        //         return (
        //             <div className="d-flex gap-1 flex-wrap">
        //                 <button
        //                     className="btn btn-sm btn-primary" // Changed to btn-info for "view" action
        //                     onClick={() => onViewRtp(entry)} // Pass the entire entry or just its ID
        //                     disabled={!entry.rtp_count || entry.rtp_count === 0} // Disable if no RTPs
        //                 >
        //                     <FiEye size={14} />
        //                 </button>
        //             </div>
        //         );
        //     },
        // },
    ];

    return (
        <div className="card mb-4">
            <TableEvaluasiAkarPenyebab
                title={title}
                data={selectedEntries}
                columns={columns}
            />
        </div>
    );
};

CardDaftarAkarPenyebab.propTypes = {
    dataJenisPenyebab: PropTypes.array.isRequired,
    selectedEntries: PropTypes.array.isRequired,
    generatedRootCausesEdit: PropTypes.array.isRequired,
    tempEntries: PropTypes.array.isRequired,
    onEditEntry: PropTypes.func.isRequired,
    onRemoveEntry: PropTypes.func.isRequired,
    onGenerateForEntry: PropTypes.func.isRequired,
    onSaveEntry: PropTypes.func.isRequired,
};

export default CardDaftarAkarPenyebab;
