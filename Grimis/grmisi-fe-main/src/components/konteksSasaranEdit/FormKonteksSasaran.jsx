import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormKonteksSasaran = ({
    formData,
    jenisKonteksSasaran,
    selectedJenisKonteksSasaran,
    setSelectedJenisKonteksSasaran,
    handleInputKonteksSasaran
}) => {
    return (
        <div className="row">
            <div className="col-12">
                <div className="mb-4">
                    <label className="form-label">Jenis Konteks <span className="text-danger">*</span></label>
                    <SelectDropdown
                        className="rounded-4"
                        options={jenisKonteksSasaran.map(item => ({ label: item.nama, value: item.id }))}
                        selectedOption={selectedJenisKonteksSasaran}
                        onSelectOption={(option) => {
                            setSelectedJenisKonteksSasaran(option);
                            handleInputKonteksSasaran({ target: { name: 'id_jenis_konteks', value: option?.value } });
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
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
                        onChange={handleInputKonteksSasaran}
                        disabled
                    />
                </div>
            </div>
            <div className="col-lg-6">
                <div className="mb-4">
                    <label className="form-label">Nama <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4"
                        name="nama"
                        placeholder="Nama"
                        value={formData.nama}
                        onChange={handleInputKonteksSasaran}
                        required
                    />
                </div>
            </div>
        </div>
    );
};

FormKonteksSasaran.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
    }).isRequired,
    jenisKonteksSasaran: PropTypes.array.isRequired,
    selectedJenisKonteksSasaran: PropTypes.object,
    setSelectedJenisKonteksSasaran: PropTypes.func.isRequired,
    handleInputKonteksSasaran: PropTypes.func.isRequired,
};

export default FormKonteksSasaran;
