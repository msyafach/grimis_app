import PropTypes from 'prop-types';
import { FiSave, FiTrash2, FiRefreshCw, FiEdit, FiX } from 'react-icons/fi';
import SelectDropdown from '../shared/SelectDropdown';
import { useState, useEffect } from 'react';
import TableEvaluasiAkarPenyebab from '../shared/table/TableEvaluasiAkarPenyebab';
import React from 'react';

const EditableCell = React.memo(({ value, onChange }) => {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
            e.target.blur(); // trigger blur manually
        }
    };

    return (
        <input
            className="form-control form-control-sm rounded-4"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
});

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
    hideJenisPenyebab = false,
}) => {
    const [backupEntry, setBackupEntry] = useState(null);

    const jenisPenyebabOptions = dataJenisPenyebab.map(item => ({
        value: item.id,
        label: item.nama,
    }));

    const isSaveEnabled = (entry) => {
        const isPenyebab = entry.jenis?.toLowerCase() === 'penyebab';
        const hasDeskripsiOrPengendalian =
            entry.root_cause_id || entry.deskripsi?.trim() || entry.pengendalian?.trim();

        if (isPenyebab) {
            return entry.jenis_penyebab_id && hasDeskripsiOrPengendalian;
        }

        return hasDeskripsiOrPengendalian;
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

    let columns = [];

    if (!hideJenisPenyebab) {
        columns.push({
            accessorKey: 'jenis_penyebab_id',
            header: 'Jenis Penyebab',
            cell: (info) => {
                const entry = info.row.original;
                const selectedOption = jenisPenyebabOptions.find(opt => String(opt.value) === String(entry.jenis_penyebab_id));

                return entry.isEditing ? (
                    <SelectDropdown
                        placeholder="Pilih Jenis Penyebab"
                        options={jenisPenyebabOptions}
                        selectedOption={selectedOption || null}
                        onSelectOption={(option) =>
                            onEditEntry(info.row.index, 'jenis_penyebab_id', option?.value || '')
                        }
                        isClearable
                    />
                ) : (
                    <span>{selectedOption?.label || '-'}</span>
                );
            },
        });
    }

    columns.push(
        {
            accessorKey: 'deskripsi',
            header: 'Deskripsi',
            cell: (info) => {
                const entry = info.row.original;
                return entry.isEditing ? (
                    <EditableCell
                        value={entry.deskripsi}
                        onChange={(val) => onEditEntry(info.row.index, 'deskripsi', val)}
                    />
                ) : entry.deskripsi;
            },
        },
        {
            accessorKey: 'jenis',
            header: 'Jenis',
            cell: (info) => {
                const entry = info.row.original;
                return entry.isEditing ? (
                    <EditableCell
                        value={entry.jenis}
                        onChange={(val) => onEditEntry(info.row.index, 'jenis', val)}
                    />
                ) : entry.jenis;
            },
        },
        {
            accessorKey: 'pengendalian',
            header: 'Pengendalian',
            cell: (info) => {
                const entry = info.row.original;
                return entry.isEditing ? (
                    <EditableCell
                        value={entry.pengendalian}
                        onChange={(val) => onEditEntry(info.row.index, 'pengendalian', val)}
                    />
                ) : entry.pengendalian;
            },
        },
        {
            accessorKey: 'jenis_pengendalian',
            header: 'Jenis Pengendalian',
            cell: (info) => {
                const entry = info.row.original;
                return entry.isEditing ? (
                    <EditableCell
                        value={entry.jenis_pengendalian}
                        onChange={(val) => onEditEntry(info.row.index, 'jenis_pengendalian', val)}
                    />
                ) : entry.jenis_pengendalian;
            },
        },
        {
            accessorKey: 'rtp_count',
            header: 'RTP',
            cell: (info) => <span>{info.row.original.rtp_count}</span>,
        },
        {
            id: 'actions',
            header: 'Aksi',
            cell: (info) => {
                const index = info.row.index;
                const entry = info.row.original;
                return (
                    <div className="d-flex gap-1 flex-wrap">
                        {entry.isEditing ? (
                            <>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleSaveEntry(index)}
                                    disabled={!isSaveEnabled(entry)}
                                >
                                    <FiSave size={14} />
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleCancel(index)}
                                >
                                    <FiX size={14} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button className="btn btn-sm btn-warning" onClick={() => handleEdit(index)}>
                                    <FiEdit size={14} />
                                </button>
                                <button className="btn btn-sm btn-success" onClick={() => handleGenerate(index)}>
                                    <FiRefreshCw size={14} />
                                </button>
                                <button className="btn btn-sm btn-danger" onClick={() => onRemoveEntry(index)}>
                                    <FiTrash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                );
            },
        },
    );

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
