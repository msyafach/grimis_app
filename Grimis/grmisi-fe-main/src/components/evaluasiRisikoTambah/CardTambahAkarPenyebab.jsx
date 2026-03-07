import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FiSave, FiRefreshCw, FiList, FiEdit, FiTrash2, FiFilePlus } from 'react-icons/fi';
import SelectDropdown from '@/components/shared/SelectDropdown';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import CardHeader from '@/components/shared/CardHeader';

const CardTambahAkarPenyebab = ({
    dataJenisPenyebab,
    selectedJenisPenyebab,
    generatedRootCausesTambah,
    onSelectJenis,
    onGenerate,
    onShowModal,
    onSaveTempEntry,
    tempEntries,
    onSaveManualEntry,
    onRemoveTempEntry,
    onClearTempEntries,
    onUpdateTempEntries,
    onViewPdf,
    generatingPdf
}) => {
    const { handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualInput, setManualInput] = useState({
        jenis: '',
        deskripsi: '',
        pengendalian: '',
        jenis_pengendalian: ''
    });

    const jenisPenyebabOptions = dataJenisPenyebab.map(item => ({
        value: item.id,
        label: item.nama
    }));

    const isGenerateEnabled = !!generatedRootCausesTambah.length;
    const isSaveEnabled = tempEntries.length > 0 && tempEntries.every(e => {
        if (e.jenis?.toLowerCase() === 'penyebab') {
            return !!e.jenis_penyebab_id;
        }
        return true;
    });


    const isManualInputValid = () => {
        return (
            selectedJenisPenyebab &&
            manualInput.deskripsi.trim() &&
            manualInput.pengendalian.trim() &&
            manualInput.jenis_pengendalian.trim()
        );
    };

    const handleManualChange = (e) => {
        const { name, value } = e.target;
        setManualInput(prev => ({ ...prev, [name]: value }));
    };


    const handleSaveManualEntry = async () => {
        if (!isManualInputValid()) return;

        const newEntry = {
            ...manualInput,
            jenis_penyebab_id: selectedJenisPenyebab.value,
            generation_id: null,
            root_cause_id: null
        };

        try {
            await onSaveManualEntry(newEntry);
            setManualInput({
                jenis: '',
                deskripsi: '',
                pengendalian: '',
                jenis_pengendalian: ''
            });
        } catch (error) {
            console.error('Gagal simpan manual entry:', error);
        }
    };

    const handleRemoveTempEntry = (index) => {
        if (onRemoveTempEntry) {
            onRemoveTempEntry(index);
        }
    };

    const handleViewPdf = () => {
        // Call the parent's onViewPdf function with refresh=true to ensure data is updated
        onViewPdf(true);
    };

    return (
        <div className="card mb-4">
            <CardHeader title="Tambah Akar Penyebab Baru" refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <div className="d-flex gap-2 mb-3">
                    <button
                        type="button"
                        className={`btn ${isManualMode ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => {
                            if (!isManualMode) {
                                onClearTempEntries();
                            }
                            setIsManualMode(true);
                        }}
                    >
                        <FiEdit size={16} className="me-2" /> Input Manual
                    </button>
                    <button
                        type="button"
                        className={`btn ${!isManualMode ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => {
                            if (isManualMode) {
                                onClearTempEntries();
                            }
                            setIsManualMode(false);
                        }}
                    >
                        <FiRefreshCw size={16} className="me-2" /> Generate by AI
                    </button>
                    <button
                        type="button"
                        className="btn btn-info ms-auto"
                        onClick={handleViewPdf}
                        disabled={generatingPdf}
                    >
                        {generatingPdf ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Generating PDF...
                            </>
                        ) : (
                            <>
                                <FiFilePlus size={16} className="me-2" /> View Bowtie Diagram
                            </>
                        )}
                    </button>
                </div>


                {isManualMode ? (
                    <>
                        <div className="row mt-3">
                            <div className="col-6">
                                <div className="mb-3">
                                    <label className="form-label">Jenis Penyebab <span className="text-danger">*</span></label>
                                    <SelectDropdown
                                        className="rounded-3"
                                        options={jenisPenyebabOptions}
                                        selectedOption={selectedJenisPenyebab}
                                        onSelectOption={onSelectJenis}
                                        isClearable
                                    />
                                </div>
                            </div>
                            <div className="col-12 mb-3">
                                <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="deskripsi"
                                    placeholder="Deskripsi"
                                    value={manualInput.deskripsi}
                                    onChange={handleManualChange} />
                            </div>
                            <div className="col-6 mb-3">
                                <label className="form-label">Jenis <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="jenis"
                                    placeholder="Jenis"
                                    value={manualInput.jenis}
                                    onChange={handleManualChange} />
                            </div>
                            <div className="col-12 mb-3">
                                <label className="form-label">Pengendalian <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="pengendalian"
                                    placeholder="Pengendalian"
                                    value={manualInput.pengendalian}
                                    onChange={handleManualChange} />
                            </div>
                            <div className="col-6 mb-3">
                                <label className="form-label">Jenis Pengendalian <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4"
                                    name="jenis_pengendalian"
                                    placeholder="Jenis Pengendalian"
                                    value={manualInput.jenis_pengendalian}
                                    onChange={handleManualChange} />
                            </div>
                            <div className="d-flex justify-content-end">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveManualEntry}
                                    disabled={!isManualInputValid()}
                                >
                                    <FiSave size={16} className="me-2" /> Simpan
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="row align-items-end">
                            <div className="col-9 d-flex gap-2 mb-3">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={onGenerate}
                                >
                                    <FiRefreshCw size={16} className="me-2" /> Generate Akar Penyebab
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    onClick={onShowModal}
                                    disabled={!isGenerateEnabled}
                                >
                                    <FiList size={16} className="me-2" /> Pilih Akar Penyebab
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={onSaveTempEntry}
                                    disabled={!isSaveEnabled}
                                >
                                    <FiSave size={16} className="me-2" /> Simpan
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {tempEntries && tempEntries.length > 0 && (
                    <div className="mt-3">
                        <h6>Data Terpilih:</h6>
                        <div className="table-responsive">
                            <table className="table table-bordered table-sm align-middle">
                                <thead className="table-light">
                                    <tr className="text-center">
                                        <th style={{ width: '15%' }}>Jenis Penyebab</th>
                                        <th style={{ width: '30%' }}>Deskripsi</th>
                                        <th style={{ width: '10%' }}>Jenis</th>
                                        <th style={{ width: '25%' }}>Pengendalian</th>
                                        <th style={{ width: '15%' }}>Jenis Pengendalian</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tempEntries.map((e, idx) => {
                                        const isDampak = e.jenis?.toLowerCase() === 'dampak';

                                        return (
                                            <tr key={idx}>
                                                {/* Kolom Jenis Penyebab: hanya tampil jika bukan dampak */}
                                                {!isDampak ? (
                                                    <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                        <SelectDropdown
                                                            className="select-dropdown-sm"
                                                            options={jenisPenyebabOptions}
                                                            selectedOption={
                                                                dataJenisPenyebab.find(j => j.id === e.jenis_penyebab_id)
                                                                    ? {
                                                                        value: e.jenis_penyebab_id,
                                                                        label: dataJenisPenyebab.find(j => j.id === e.jenis_penyebab_id)?.nama
                                                                    }
                                                                    : null
                                                            }
                                                            onSelectOption={(selected) => {
                                                                const updated = [...tempEntries];
                                                                updated[idx].jenis_penyebab_id = selected?.value || '';
                                                                onUpdateTempEntries && onUpdateTempEntries(updated);
                                                            }}
                                                            isClearable
                                                        />
                                                    </td>
                                                ) : (
                                                    <td className="text-muted text-center">-</td> // atau bisa juga kosong ""
                                                )}

                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.deskripsi}</td>
                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.jenis}</td>
                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.pengendalian}</td>
                                                <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.jenis_pengendalian}</td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => handleRemoveTempEntry(idx)}
                                                        title="Hapus item"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

CardTambahAkarPenyebab.propTypes = {
    dataJenisPenyebab: PropTypes.array.isRequired,
    selectedJenisPenyebab: PropTypes.object,
    generatedRootCausesTambah: PropTypes.array,
    onSelectJenis: PropTypes.func.isRequired,
    onGenerate: PropTypes.func.isRequired,
    onSaveTempEntry: PropTypes.func.isRequired,
    onShowModal: PropTypes.func.isRequired,
    tempEntries: PropTypes.array.isRequired,
    onSaveManualEntry: PropTypes.func.isRequired,
    onRemoveTempEntry: PropTypes.func.isRequired,
    onClearTempEntries: PropTypes.func.isRequired,
    onUpdateTempEntries: PropTypes.func.isRequired,
    onViewPdf: PropTypes.func.isRequired,
    generatingPdf: PropTypes.bool.isRequired
};

export default CardTambahAkarPenyebab;
