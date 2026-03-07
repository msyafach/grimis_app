import PropTypes from 'prop-types';

const FormKriteriaKemungkinan = ({
    formData,
}) => {

    return (
        <div className="row">
            <div className="col-6">
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
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Nama <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="nama"
                        placeholder="Nama"
                        value={formData.nama}
                        disabled
                    />
                </div>
            </div>
            <div className="col-6">
                <div className="mb-4">
                    <label className="form-label">Nilai <span className="text-danger">*</span></label>
                    <input
                        type="number"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="nilai"
                        placeholder="Nilai"
                        value={formData.nilai}
                        disabled
                    />
                </div>
            </div>
            <div className="col-12">
                <div className="mb-4">
                    <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                    <textarea
                        name="deskripsi"
                        rows={3}
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={formData.deskripsi}
                        disabled
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
