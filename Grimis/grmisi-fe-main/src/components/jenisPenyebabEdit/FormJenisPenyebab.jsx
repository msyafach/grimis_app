import PropTypes from "prop-types";

const FormJenisPenyebab = ({ formData, handleInputJenisPenyebab }) => {
  return (
    <div className="row">
      <div className="col-lg-6">
        <div className="mb-4">
          <label className="form-label text-uppercase">
            Kode <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control form-control-sm rounded-4"
            name="kode"
            placeholder="Kode"
            value={formData.kode}
            onChange={handleInputJenisPenyebab}
            required
          />
        </div>
      </div>
      <div className="col-lg-6">
        <div className="mb-4">
          <label className="form-label text-uppercase">
            Nama <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control form-control-sm rounded-4"
            name="nama"
            placeholder="Nama"
            value={formData.nama}
            onChange={handleInputJenisPenyebab}
            required
          />
        </div>
      </div>
    </div>
  );
};

FormJenisPenyebab.propTypes = {
  formData: PropTypes.shape({
    kode: PropTypes.string.isRequired,
    nama: PropTypes.string.isRequired,
  }).isRequired,
  handleInputJenisPenyebab: PropTypes.func.isRequired,
};

export default FormJenisPenyebab;
