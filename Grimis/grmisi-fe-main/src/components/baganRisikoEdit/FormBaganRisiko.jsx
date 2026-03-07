import PropTypes from 'prop-types';

const FormBaganRisiko = ({
    formData,
    handleInput,
}) => {
    return (
        <>
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
                            className="form-control form-control-sm rounded-4"
                            name="nama"
                            placeholder="Nama"
                            value={formData.nama}
                            onChange={handleInput}
                            required
                        />
                    </div>
                </div>
            </div>
            <div className="row">
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Tahun <span className="text-danger">*</span></label>
                        <input
                            type="number"
                            className="form-control form-control-sm rounded-4"
                            name="tahun"
                            placeholder="Tahun"
                            value={formData.tahun}
                            onChange={handleInput}
                            min="2020"
                            max={new Date().getFullYear() + 10}
                            required
                        />
                    </div>
                </div>
            </div>
            <div className="row">
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
        </>
    );
};

FormBaganRisiko.propTypes = {
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
        deskripsi: PropTypes.string,
        tahun: PropTypes.integer,
        id_instansi: PropTypes.string,
        id_induk_unit_kerja: PropTypes.string,
    }).isRequired,
    handleInput: PropTypes.func.isRequired,
};

export default FormBaganRisiko;
