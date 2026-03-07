import PropTypes from 'prop-types';
import { FiLoader, FiPlus, FiBookOpen, FiZap } from 'react-icons/fi';
import SelectDropdown from '@/components/shared/SelectDropdown';
import { showToast } from '@/utils/toast';

const FormIdentifikasiRisiko = ({
    jenisKonteksSasaran,
    kontekSasaran,
    kontekProbis,
    indikator,
    kamus,
    kategoriRisiko,
    selectedValues,
    handleSelectChange,
    formData,
    handleInputText,
    handleGenerateStatements,
    openModal,
    isByAI,
    setIsByAI,
}) => {
    const validateRequiredFields = () => {
        if (!selectedValues.jenisKonteksSasaran?.value) {
            showToast('error', 'Silakan pilih Sasaran terlebih dahulu');
            return false;
        }
        if (!selectedValues.konteksSasaran?.value) {
            showToast('error', 'Silakan pilih Konteks Sasaran terlebih dahulu');
            return false;
        }
        if (!selectedValues.indikator?.value) {
            showToast('error', 'Silakan pilih Indikator terlebih dahulu');
            return false;
        }
        if (!selectedValues.konteksProbis?.value) {
            showToast('error', 'Silakan pilih Konteks Probis terlebih dahulu');
            return false;
        }
        return true;
    };

    const handleOpenGenerateModal = () => {
        if (validateRequiredFields()) {
            setIsByAI(true);
            openModal();
        }
    };

    return (
        <div className="row">
            {/* === UMUM === */}
            <div className="col-12 mb-4">
                <label className="form-label">Sasaran <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="rounded-3"
                    options={jenisKonteksSasaran.map(item => ({ label: item.nama, value: item.id }))}
                    selectedOption={selectedValues.jenisKonteksSasaran}
                    onSelectOption={(option) => handleSelectChange('id_jenis_konteks_sasaran', option)}
                    defaultSelect=""
                />
            </div>

            <div className="col-12 mb-4">
                <label className="form-label">Konteks Sasaran <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="rounded-3"
                    options={kontekSasaran.map(item => ({ label: item.nama, value: item.id }))}
                    selectedOption={selectedValues.konteksSasaran}
                    onSelectOption={(option) => handleSelectChange('id_konteks_sasaran', option)}
                    defaultSelect=""
                />
            </div>

            <div className="col-12 mb-4">
                <label className="form-label">Indikator <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="rounded-3"
                    options={indikator.map(item => ({ label: item.nama, value: item.id }))}
                    selectedOption={selectedValues.indikator}
                    onSelectOption={(option) => handleSelectChange('id_indikator', option)}
                    defaultSelect=""
                />
            </div>

            <div className="col-12 mb-4">
                <label className="form-label">Konteks Probis <span className="text-danger">*</span></label>
                <SelectDropdown
                    className="rounded-3"
                    options={kontekProbis.map(item => ({ label: item.nama, value: item.id }))}
                    selectedOption={selectedValues.konteksProbis}
                    onSelectOption={(option) => handleSelectChange('id_konteks_probis', option)}
                    defaultSelect=""
                />
            </div>

            {/* === TOGGLE ACTION BUTTONS === */}
            <div className="col-12 mb-4 d-flex gap-3">
                <button
                    className={`btn ${!isByAI ? 'btn-primary' : 'btn-outline-secondary'} flex-fill`}
                    type="button"
                    onClick={() => window.location.href = '/parameters/kamus-risiko/tambah'}
                >
                    <FiPlus size={16} className="me-2" />
                    Buat Pernyataan Risiko
                </button>
                <button
                    className={`btn ${!isByAI ? 'btn-primary' : 'btn-outline-secondary'} flex-fill`}
                    type="button"
                    onClick={() => setIsByAI(false)}
                >
                    <FiBookOpen size={16} className="me-2" />
                    Pilih dari Kamus
                </button>
                <button
                    className={`btn ${isByAI ? 'btn-success' : 'btn-outline-success'} flex-fill`}
                    type="button"
                    onClick={handleOpenGenerateModal}
                >
                    <FiLoader size={16} className="me-2" />
                    Generate Pernyataan Risiko by AI
                </button>
                <button
                    className={`btn ${isByAI ? 'btn-success' : 'btn-outline-secondary'} flex-fill`}
                    type="button"
                    onClick={handleOpenGenerateModal}
                >
                    <FiZap size={16} className="me-2" />
                    Pilih dari AI
                </button>
            </div>

            {/* === KONDISI isByAI === */}
            {isByAI ? (
                <>
                    <div className="col-12 mb-4">
                        <label className="form-label">Pernyataan Risiko (AI)</label>
                        <input
                            className="form-control form-control-sm rounded-4 bg-light"
                            value={formData.pernyataan_risiko}
                            readOnly
                            disabled
                        />
                    </div>
                    <div className="col-12 mb-4">
                        <label className="form-label">Deskripsi Risiko</label>
                        <input
                            className="form-control form-control-sm rounded-4 bg-light"
                            value={formData.deskripsi}
                            readOnly
                            disabled
                        />
                    </div>
                    <div className="col-12 mb-4">
                        <label className="form-label">Kategori Risiko <span className="text-danger">*</span></label>
                        <SelectDropdown
                            className="rounded-3"
                            options={kategoriRisiko.map(item => ({ label: item.nama, value: item.id }))}
                            selectedOption={selectedValues.kategoriRisiko}
                            onSelectOption={(option) => handleSelectChange('id_kategori_risiko', option)}
                            defaultSelect=""
                        />
                    </div>
                </>
            ) : (
                <>
                    <div className="col-12 mb-4">
                        <label className="form-label">Pernyataan Risiko (Kamus Risiko) <span className="text-danger">*</span></label>
                        <SelectDropdown
                            className="rounded-3"
                            options={kamus.map(item => ({ label: item.nama, value: item.id }))}
                            selectedOption={selectedValues.kamus}
                            onSelectOption={(option) => handleSelectChange('id_kamus', option)}
                            defaultSelect=""
                        />
                    </div>

                    <div className="col-12 mb-4">
                        <label className="form-label">Kategori Risiko <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            value={selectedValues.kategoriRisiko?.label || ''}
                            readOnly
                            disabled
                        />
                    </div>
                </>
            )}

            {/* === Uraian Dampak === */}
            <div className="col-12 mb-4">
                <label className="form-label">Uraian Dampak <span className="text-danger">*</span></label>
                <textarea
                    name="uraian_dampak"
                    rows={3}
                    className="form-control form-control-sm rounded-4"
                    value={formData.uraian_dampak}
                    onChange={handleInputText}
                />
            </div>
        </div>
    );
};

FormIdentifikasiRisiko.propTypes = {
    jenisKonteksSasaran: PropTypes.array.isRequired,
    kontekSasaran: PropTypes.array.isRequired,
    kontekProbis: PropTypes.array.isRequired,
    indikator: PropTypes.array.isRequired,
    kamus: PropTypes.array.isRequired,
    kategoriRisiko: PropTypes.array.isRequired,
    selectedValues: PropTypes.object.isRequired,
    handleSelectChange: PropTypes.func.isRequired,
    formData: PropTypes.object.isRequired,
    handleInputText: PropTypes.func.isRequired,
    handleGenerateStatements: PropTypes.func.isRequired,
    openModal: PropTypes.func.isRequired,
    isByAI: PropTypes.bool.isRequired,
    setIsByAI: PropTypes.func.isRequired,
};

export default FormIdentifikasiRisiko;
