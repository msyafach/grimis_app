import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormKonteksProbis = ({
    formData,
    jenisKonteksProbis,
    selectedJenisKonteksProbis,
    setSelectedJenisKonteksProbis,
    handleInputKonteksProbis
}) => {

    return (
        <div className="row">
            <div className="col-12">
                <div className="mb-4">
                    <label className="form-label">Jenis Konteks <span className="text-danger">*</span></label>
                    <SelectDropdown
                        className="rounded-3"
                        options={jenisKonteksProbis.map(item => ({ label: item.nama, value: item.id }))}
                        selectedOption={selectedJenisKonteksProbis}
                        onSelectOption={(option) => {
                            setSelectedJenisKonteksProbis(option);
                            handleInputKonteksProbis({ target: { name: 'id_jenis_konteks', value: option?.value } });
                        }}
                        defaultSelect=""
                    />
                </div>
            </div>
            <div className="col-lg-6">
                <div className="mb-4">
                    <label className="form-label">Kode <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-3"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
                        onChange={handleInputKonteksProbis}
                        required
                    />
                </div>
            </div>
            <div className="col-lg-6">
                <div className="mb-4">
                    <label className="form-label">Nama <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-3"
                        name="nama"
                        placeholder="Nama"
                        value={formData.nama}
                        onChange={handleInputKonteksProbis}
                        required
                    />
                </div>
            </div>
        </div>
    );
};

FormKonteksProbis.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
    }).isRequired,
    jenisKonteksProbis: PropTypes.array.isRequired,
    selectedJenisKonteksProbis: PropTypes.object,
    setSelectedJenisKonteksProbis: PropTypes.func.isRequired,
    handleInputKonteksProbis: PropTypes.func.isRequired,
};

export default FormKonteksProbis;
