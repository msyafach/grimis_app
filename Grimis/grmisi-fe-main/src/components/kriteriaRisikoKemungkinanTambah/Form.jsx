import PropTypes from 'prop-types';

const FormKriteriaKemungkinan = ({
    formData,
    handleInput
}) => {

    return (
        <div className="row">
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Kode <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
                        onChange={handleInput}
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
                        onChange={handleInput}
                        required
                    />
                </div>
            </div>
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Nilai <span className="text-danger">*</span></label>
                    <input
                        type="number"
                        className="form-control form-control-sm rounded-4"
                        name="nilai"
                        placeholder="Nilai"
                        value={formData.nilai}
                        onChange={handleInput}
                        required
                    />
                </div>
            </div>
            <div className="col-12">
                <div className="mb-4">
                    <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                    <textarea
                        name="deskripsi"
                        placeholder="Deskripsi"
                        rows={3}
                        className="form-control form-control-sm rounded-4"
                        value={formData.deskripsi}
                        onChange={handleInput}
                    />
                </div>
            </div>
        </div>
    );
};

FormKriteriaKemungkinan.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
        nilai: PropTypes.number.isRequired,
        deskripsi: PropTypes.string.isRequired,
    }).isRequired,
    handleInput: PropTypes.func.isRequired,
};

export default FormKriteriaKemungkinan;
