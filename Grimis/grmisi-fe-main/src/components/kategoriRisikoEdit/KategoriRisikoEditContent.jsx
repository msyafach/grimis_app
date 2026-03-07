import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import FormKategoriRisiko from './FormKategoriRisiko';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

const KategoriRisikoEditContent = ({ title = "Edit Kategori Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { kategoriRisikoId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_instansi": "",
        "id_induk_unit_kerja": "",
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setErrorMessage("Token tidak tersedia. Silakan login ulang.");
                setLoading(false);
                return;
            }
            
            // Validate instansi ID before fetching data
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }
            
            // Fetch the kategori risiko data
            const response = await axios.get(API_ENDPOINTS.getKategoriRisikoById(kategoriRisikoId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_instansi: response.data.id_instansi,
                id_induk_unit_kerja: response.data.id_induk_unit_kerja
            });
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
        } finally {
            setLoading(false);
        }
    }, [kategoriRisikoId, idInstansi]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputKategoriRisiko = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
            id_instansi: idInstansi,
            id_induk_unit_kerja: idIndukUnitKerja,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                setErrorMessage("Token tidak tersedia. Silakan login ulang.");
                setLoading(false);
                return;
            }
            
            // Validate instansi ID before submission
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }
            
            // Validate induk unit kerja ID if available
            if (idIndukUnitKerja) {
                const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                if (!indukUnitValidation.valid) {
                    console.warn("Induk unit kerja ID tidak valid, akan menggunakan default");
                }
            }
            
            // Update form data with validated IDs
            const submissionData = {
                ...formData,
                id_instansi: idInstansi,
                id_induk_unit_kerja: idIndukUnitKerja || "",
            };
            
            await axios.put(API_ENDPOINTS.updateKategoriRisiko(kategoriRisikoId), submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            fetchData();
            showToast("success", "Kategori Risiko Berhasil Diperbarui!");
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorMessage);
            showToast("error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/kategori-risiko');
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return (
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <ContentLoaderWrapper loading={loading} error={errorMessage} />
            </div>
        );
    }

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="col-12">
                            <form onSubmit={handleSubmit}>
                                {/* Form Fields */}
                                <FormKategoriRisiko
                                    formData={formData}
                                    handleInputKategoriRisiko={handleInputKategoriRisiko}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={handleBack}><FiArrowLeft size={16} className="me-2" />Kembali</button>
                                    <button className="btn btn-lg btn-primary" type="submit"><FiSave size={16} className="me-2" />Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

KategoriRisikoEditContent.propTypes = {
    title: PropTypes.string
};

export default KategoriRisikoEditContent;
