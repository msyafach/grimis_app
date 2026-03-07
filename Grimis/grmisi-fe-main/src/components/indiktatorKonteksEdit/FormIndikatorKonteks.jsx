import PropTypes from 'prop-types';

const FormIndikatorKonteks = ({
    formData,
    handleInputIndikatorKonteks
}) => {

    return (
        <div className="row">
            <div className="col-lg-6">
                <div className="mb-4">
                    <label className="form-label">Kode <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
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
                        onChange={handleInputIndikatorKonteks}
                        required
                    />
                </div>
            </div>
        </div>
    );
};

FormIndikatorKonteks.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
    }).isRequired,
    handleInputIndikatorKonteks: PropTypes.func.isRequired,
};

export default FormIndikatorKonteks;
