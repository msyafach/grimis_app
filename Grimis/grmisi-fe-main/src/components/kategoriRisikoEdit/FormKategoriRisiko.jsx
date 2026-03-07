import PropTypes from 'prop-types';

const FormKategoriRisiko = ({
    formData,
    handleInputKategoriRisiko
}) => {
    return (
        <>
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Kode <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
                        onChange={handleInputKategoriRisiko}
                        required
                    />
                </div>
            </div>
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Nama <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4"
                        name="nama"
                        placeholder="Nama"
                        value={formData.nama}
                        onChange={handleInputKategoriRisiko}
                        required
                    />
                </div>
            </div>
        </>
    );
};

FormKategoriRisiko.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
    }).isRequired,
    handleInputKategoriRisiko: PropTypes.func.isRequired,
};

export default FormKategoriRisiko;
