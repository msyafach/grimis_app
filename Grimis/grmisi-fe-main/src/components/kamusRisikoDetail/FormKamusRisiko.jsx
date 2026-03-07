import PropTypes from 'prop-types';

const FormKamusRisiko = ({
    selectedKategoriRisiko,
    formData,
}) => {
    return (
        <>
            <div className="row">
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Kategori Risiko <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="kode"
                            placeholder="Kode"
                            value={selectedKategoriRisiko.label}
                            disabled
                        />
                    </div>
                </div>
            </div>
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
                <div className="col-12">
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
            </div>
        </>
    );
};

FormKamusRisiko.propTypes = {
    kategoriRisiko: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            nama: PropTypes.string.isRequired,
        })
    ).isRequired,
    selectedKategoriRisiko: PropTypes.shape({
        label: PropTypes.string,
        value: PropTypes.string,
    }),
    formData: PropTypes.shape({
        kode: PropTypes.string.isRequired,
        nama: PropTypes.string.isRequired,
        id_instansi: PropTypes.string,
        id_kategori_risiko: PropTypes.string,
    }).isRequired,
    handleInput: PropTypes.func.isRequired,
    handleSelectChange: PropTypes.func.isRequired,
};

export default FormKamusRisiko;
