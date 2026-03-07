import PropTypes from 'prop-types';
import { FiTrash } from "react-icons/fi";

const FormJenisKonteksEdit = ({
    sasaranData,
    probisData,
    setSasaranData,
    setProbisData,
}) => {
    // Menangani perubahan input SASARAN
    const handleSasaranChange = (e) => {
        const { name, value } = e.target;
        const sasaran = sasaranData.length > 0 ? sasaranData[0] : { kode: '', nama: '', jenis: 'SASARAN', isNew: true };
        
        // Preserve the existing properties while updating the changed field
        const updatedSasaran = { 
            ...sasaran,
            [name]: value
        };
        
        // Ensure id and isNew properties are maintained
        setSasaranData([updatedSasaran]);
    };

    // Menangani perubahan input PROBIS
    const handleProbisChange = (e) => {
        const { name, value } = e.target;
        const probis = probisData.length > 0 ? probisData[0] : { kode: '', nama: '', jenis: 'PROBIS', isNew: true };
        
        // Preserve the existing properties while updating the changed field
        const updatedProbis = {
            ...probis,
            [name]: value
        };
        
        // Ensure id and isNew properties are maintained
        setProbisData([updatedProbis]);
    };

    // Mengambil data sasaran pertama atau membuat default jika tidak ada
    const sasaran = sasaranData.length > 0 ? sasaranData[0] : { kode: '', nama: '', jenis: 'SASARAN', isNew: true };
    
    // Mengambil data probis pertama atau membuat default jika tidak ada
    const probis = probisData.length > 0 ? probisData[0] : { kode: '', nama: '', jenis: 'PROBIS', isNew: true };

    return (
        <div>
            <h5 className="fw-bold">Jenis Konteks</h5>
            <div className="row">
                {/* SASARAN Section */}
                <div className="col-lg-6 mb-4">
                    <h6 className="fw-bold">SASARAN</h6>
                    <div className="row mb-3">
                        <div className="col-lg-3">
                            <label className="form-label">Kode Sasaran<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="kode"
                                placeholder="Kode Sasaran"
                                value={sasaran.kode || ""}
                                onChange={handleSasaranChange}
                            />
                        </div>
                        <div className="col-lg-8">
                            <label className="form-label">Nama Sasaran <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="nama"
                                placeholder="Nama Sasaran"
                                value={sasaran.nama || ""}
                                onChange={handleSasaranChange}
                            />
                        </div>
                        <div className="col-lg-1">
                            {/* Tombol hapus dihilangkan */}
                        </div>
                    </div>
                </div>

                {/* PROBIS Section */}
                <div className="col-lg-6 mb-4">
                    <h6 className="fw-bold">PROBIS</h6>
                    <div className="row mb-3">
                        <div className="col-lg-3">
                            <label className="form-label">Kode Probis<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="kode"
                                placeholder="Kode Probis"
                                value={probis.kode || ""}
                                onChange={handleProbisChange}
                            />
                        </div>
                        <div className="col-lg-8">
                            <label className="form-label">Nama Probis <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-3"
                                name="nama"
                                placeholder="Nama Probis"
                                value={probis.nama || ""}
                                onChange={handleProbisChange}
                            />
                        </div>
                        <div className="col-lg-1">
                            {/* Tombol hapus dihilangkan */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

FormJenisKonteksEdit.propTypes = {
    sasaranData: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.any,
            kode: PropTypes.string,
            nama: PropTypes.string,
        })
    ).isRequired,
    probisData: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.any,
            kode: PropTypes.string,
            nama: PropTypes.string,
        })
    ).isRequired,
    setSasaranData: PropTypes.func.isRequired,
    setProbisData: PropTypes.func.isRequired,
};

export default FormJenisKonteksEdit;
