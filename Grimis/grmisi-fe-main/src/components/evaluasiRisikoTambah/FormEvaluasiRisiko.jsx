import { useState } from 'react';
import PropTypes from 'prop-types';
import { FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import Select from 'react-select';

const FormEvaluasiRisiko = ({
    identifikasiRisiko,
    dataJenisPenyebab,
    formData,
    handleInputText,
    handleGenerateRootCauses,
    openModal,
    selectedEntries = [],
    onAddEntry,
    onRemoveEntry,
    onEditEntry,
    onGenerateForEntry
}) => {
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);

    // Handle jenis penyebab selection
    const handleJenisPenyebabChange = (option) => {
        setSelectedJenisPenyebab(option);
        // Update form data with selected jenis penyebab
        handleInputText({
            target: {
                name: 'jenis_penyebab_id',
                value: option ? option.value : ''
            }
        });
    };

    // Handle generate button click
    const handleGenerate = () => {
        if (selectedJenisPenyebab) {
            handleGenerateRootCauses();
            openModal();
        } else {
            alert('Pilih Jenis Penyebab terlebih dahulu');
        }
    };

    // Format jenis penyebab options for react-select
    const jenisPenyebabOptions = dataJenisPenyebab.map(item => ({
        value: item.id,
        label: item.nama
    }));

    console.log(identifikasiRisiko)

    return (
        <div className="container-fluid px-0">
            {/* Identifikasi Risiko Info */}
            {identifikasiRisiko && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card bg-light">
                            <div className="card-body">
                                <h5 className="card-title">Informasi Identifikasi Risiko</h5>
                                <div className="mb-2">
                                    <strong>Pernyataan Risiko:</strong> {identifikasiRisiko.pernyataan_risiko}
                                </div>
                                <div className="mb-2">
                                    <strong>Kategori Risiko:</strong> {identifikasiRisiko.kategori_risiko?.nama || '-'}
                                </div>
                                <div>
                                    <strong>Dampak:</strong> {identifikasiRisiko.uraian_dampak || '-'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form untuk menambah entry baru */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">Tambah Akar Penyebab Baru</h5>
                            <div className="row align-items-end">
                                <div className="col-md-8">
                                    <div className="mb-3">
                                        <label className="form-label">Jenis Penyebab <span className="text-danger">*</span></label>
                                        <Select
                                            placeholder="Pilih Jenis Penyebab"
                                            options={jenisPenyebabOptions}
                                            value={selectedJenisPenyebab}
                                            onChange={handleJenisPenyebabChange}
                                            isClearable
                                            className="react-select"
                                            classNamePrefix="select"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="mb-3">
                                        <button
                                            type="button"
                                            className="btn btn-primary w-100"
                                            onClick={handleGenerate}
                                            disabled={!selectedJenisPenyebab}
                                        >
                                            <FiRefreshCw size={16} className="me-2" /> Generate Akar Penyebab
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daftar Akar Penyebab yang sudah ditambahkan */}
            {selectedEntries.length > 0 && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Daftar Akar Penyebab</h5>
                                <div className="table-responsive">
                                    <table className="table table-bordered">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '25%' }}>Jenis</th>
                                                <th style={{ width: '30%' }}>Deskripsi</th>
                                                <th style={{ width: '25%' }}>Pengendalian</th>
                                                <th style={{ width: '15%' }}>Jenis Pengendalian</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedEntries.map((entry, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div className="mb-2">
                                                            <Select
                                                                placeholder="Pilih Jenis Penyebab"
                                                                options={jenisPenyebabOptions}
                                                                value={jenisPenyebabOptions.find(option => option.value === entry.jenis_penyebab_id)}
                                                                onChange={(option) => onEditEntry(index, 'jenis_penyebab_id', option ? option.value : '')}
                                                                isClearable
                                                                className="react-select"
                                                                classNamePrefix="select"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => onGenerateForEntry(index)}
                                                        >
                                                            <FiRefreshCw size={14} className="me-1" /> Generate
                                                        </button>
                                                    </td>
                                                    <td>{entry.deskripsi}</td>
                                                    <td>{entry.pengendalian}</td>
                                                    <td>{entry.jenis_pengendalian}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => onRemoveEntry(index)}
                                                        >
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

FormEvaluasiRisiko.propTypes = {
    identifikasiRisiko: PropTypes.object,
    dataJenisPenyebab: PropTypes.array,
    formData: PropTypes.object,
    handleInputText: PropTypes.func.isRequired,
    handleGenerateRootCauses: PropTypes.func.isRequired,
    openModal: PropTypes.func.isRequired,
    selectedEntries: PropTypes.array,
    onAddEntry: PropTypes.func.isRequired,
    onRemoveEntry: PropTypes.func.isRequired,
    onEditEntry: PropTypes.func.isRequired,
    onGenerateForEntry: PropTypes.func.isRequired
};

export default FormEvaluasiRisiko;