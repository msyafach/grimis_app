import PropTypes from 'prop-types';
import { FiSave, FiTrash2, FiRefreshCw, FiEdit, FiX } from 'react-icons/fi';
import SelectDropdown from '../shared/SelectDropdown';
import { useState } from 'react';
import TableEvaluasiAkarPenyebab from '../shared/table/TableEvaluasiAkarPenyebab';

const CardDaftarAkarPenyebab = ({
    dataJenisPenyebab,
    selectedEntries,
    generatedRootCausesEdit,
    tempEntries,
    onEditEntry,
    onRemoveEntry,
    onGenerateForEntry,
    onSaveEntry,
}) => {
    const [editIndex, setEditIndex] = useState(-1);
    const [pendingSaveIndex, setPendingSaveIndex] = useState(-1);
    const [backupEntry, setBackupEntry] = useState(null); // Untuk membatalkan

    const jenisPenyebabOptions = dataJenisPenyebab.map(item => ({
        value: item.id,
        label: item.nama
    }));

    const isSaveEnabled = (entry) => {
        return (
            entry.jenis_penyebab_id &&
            (entry.root_cause_id || entry.deskripsi?.trim() || entry.pengendalian?.trim())
        );
    };

    const handleSaveEntry = (index) => {
        onSaveEntry(index);
        setEditIndex(-1);
        setPendingSaveIndex(-1);
    };

    const handleCancel = (index) => {
        if (backupEntry) {
            onEditEntry(index, 'jenis', backupEntry.jenis);
            onEditEntry(index, 'deskripsi', backupEntry.deskripsi);
            onEditEntry(index, 'pengendalian', backupEntry.pengendalian);
            onEditEntry(index, 'jenis_pengendalian', backupEntry.jenis_pengendalian);
            onEditEntry(index, 'generation_id', backupEntry.generation_id);
            onEditEntry(index, 'root_cause_id', backupEntry.root_cause_id);
        }
        setPendingSaveIndex(-1);
    };

    const handleGenerate = (index) => {
        // Simpan backup
        setBackupEntry({ ...selectedEntries[index] });
        setPendingSaveIndex(index);
        onGenerateForEntry(index);
    };


    return (
        <>

            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title mb-4">Daftar Akar Penyebab</h5>
                    <div className="table-responsive mb-4">


                        <table className="table table-bordered">
                            <thead>
                                <tr className="text-center">
                                    <th style={{ width: '10%' }}>Jenis Penyebab</th>
                                    <th style={{ width: '30%' }}>Deskripsi</th>
                                    <th style={{ width: '14%' }}>Jenis</th>
                                    <th style={{ width: '30%' }}>Pengendalian</th>
                                    <th style={{ width: '14%' }}>Jenis Pengendalian</th>
                                    <th style={{ width: '2%' }}>RTP</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedEntries.map((entry, index) => (
                                    <tr key={index}>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            <SelectDropdown
                                                placeholder="Pilih Jenis Penyebab"
                                                options={jenisPenyebabOptions}
                                                selectedOption={
                                                    jenisPenyebabOptions.find(opt => String(opt.value) === String(entry.jenis_penyebab_id)) || null
                                                }
                                                onSelectOption={(option) =>
                                                    onEditEntry(index, 'jenis_penyebab_id', option?.value || '')
                                                }
                                                isClearable
                                            />
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {editIndex === index ? (
                                                <input
                                                    className="form-control form-control-sm rounded-4"
                                                    value={entry.deskripsi}
                                                    onChange={(e) => onEditEntry(index, 'deskripsi', e.target.value)}
                                                />
                                            ) : entry.deskripsi}
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {editIndex === index ? (
                                                <input
                                                    className="form-control form-control-sm rounded-4"
                                                    value={entry.jenis}
                                                    onChange={(e) => onEditEntry(index, 'jenis', e.target.value)}
                                                />
                                            ) : entry.jenis}
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {editIndex === index ? (
                                                <input
                                                    className="form-control form-control-sm rounded-4"
                                                    value={entry.pengendalian}
                                                    onChange={(e) => onEditEntry(index, 'pengendalian', e.target.value)}
                                                />
                                            ) : entry.pengendalian}
                                        </td>
                                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {editIndex === index ? (
                                                <input
                                                    className="form-control form-control-sm rounded-4"
                                                    value={entry.jenis_pengendalian}
                                                    onChange={(e) => onEditEntry(index, 'jenis_pengendalian', e.target.value)}
                                                />
                                            ) : entry.jenis_pengendalian}
                                        </td>
                                        <td>{entry.rtp_count}</td>
                                        <td className="d-flex flex-column align-items-start gap-1">
                                            {editIndex === index ? (
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
                                                        onClick={() => setEditIndex(-1)} // Batal edit
                                                    >
                                                        <FiX size={14} />
                                                    </button>
                                                </>
                                            ) : pendingSaveIndex === index ? (
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
                                                    <button
                                                        className="btn btn-sm btn-warning"
                                                        onClick={() => setEditIndex(index)}
                                                    >
                                                        <FiEdit size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleGenerate(index)}
                                                    >
                                                        <FiRefreshCw size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => onRemoveEntry(index)}
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
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
