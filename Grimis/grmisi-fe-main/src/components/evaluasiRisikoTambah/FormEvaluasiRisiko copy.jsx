import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiExternalLink } from 'react-icons/fi';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';

const FormEvaluasiRisiko = ({ identifikasiRisikoId, analisisRisikoId }) => {
    const [akarPenyebabData, setAkarPenyebabData] = useState([{
        deskripsi: '',
        jenisPenyebab: '',
        jumlahMitigasi: 1
    }]);

    const navigate = useNavigate();

    // Menangani perubahan input untuk setiap baris
    const handleInputChange = (e, index) => {
        const { name, value } = e.target;
        const updatedAkarPenyebabData = [...akarPenyebabData];
        updatedAkarPenyebabData[index][name] = value;
        setAkarPenyebabData(updatedAkarPenyebabData);
    };

    // Menambah baris baru
    const addAkarPenyebab = () => {
        setAkarPenyebabData([
            ...akarPenyebabData,
            { deskripsi: '', jenisPenyebab: '', jumlahMitigasi: 1 }
        ]);
    };

    // Submit untuk menambah Akar Penyebab
    const handleSubmit = async (e) => {
        e.preventDefault();
        const requestData = {
            identifikasi_risiko_id: identifikasiRisikoId,
            analisis_risiko_id: analisisRisikoId,
            akar_penyebab: akarPenyebabData // Akar penyebab beserta pengendalian
        };

        try {
            await axios.post(API_ENDPOINTS.postEvaluasiRisiko, requestData);
            console.log("Data berhasil ditambahkan!");
        } catch (error) {
            console.error("Error adding Akar Penyebab:", error);
        }
    };

    const handleKelolaMitigasi = (evaluasiId) => {
        navigate(`/kelola-mitigasi/${evaluasiId}`);
    };

    return (
        <div>
            <h3>Evaluasi Risiko</h3>
            <form onSubmit={handleSubmit}>
                {akarPenyebabData.map((item, index) => (
                    <div className="row mb-3" key={index}>
                        <div className="col-5">
                            <div className="mb-4">
                                <label className="form-label">Akar Penyebab <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="deskripsi"
                                    value={item.deskripsi}
                                    onChange={(e) => handleInputChange(e, index)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="mb-4">
                                <label className="form-label">Jenis Penyebab <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="jenisPenyebab"
                                    value={item.jenisPenyebab}
                                    onChange={(e) => handleInputChange(e, index)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-1">
                            <div className="mb-4">
                                <label className="form-label">Jumlah Mitigasi <span className="text-danger">*</span></label>
                                <div className="d-flex justify-content-center mt-2 mb-4">
                                    {item.jumlahMitigasi}
                                </div>
                            </div>
                        </div>
                        <div className="col-2">
                            <div className="mb-4">
                                <label className="form-label">Mitigasi <span className="text-danger">*</span></label>
                                <div className="d-flex justify-content-center mb-4">
                                    <button className="btn btn-primary" type="button" onClick={() => handleKelolaMitigasi(item.id)}>
                                        <FiExternalLink size={16} className="me-2" />Kelola Mitigasi
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <button className="btn btn-md btn-primary" type="submit">
                    Simpan Akar Penyebab
                </button>
            </form>

            <div className="d-flex justify-content-center">
                <button className="btn btn-md btn-primary" type="button" onClick={addAkarPenyebab}>
                    <FiPlus size={16} /> Tambah Akar Penyebab
                </button>
            </div>
        </div>
    );
};

export default FormEvaluasiRisiko;
