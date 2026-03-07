import { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormJenisPenyebab from './FormJenisPenyebab';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';

setLanguage('id');

const JenisPenyebabTambahContent = ({ title = "Tambah Jenis Penyebab", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_instansi": "",
        "id_induk_unit_kerja": "",
    });
    
    if (isRemoved) return null;

    const handleInputJenisPenyebab = (e) => {
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
                showToast("error", "Token tidak tersedia. Silakan login ulang.");
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
            
            await axios.post(API_ENDPOINTS.postJenisPenyebab, submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            showToast("success", "Jenis Penyebab Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
            
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
            showToast("error", translatedError);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/jenis-penyebab');
    };
    
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
                                <FormJenisPenyebab
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleInputJenisPenyebab={handleInputJenisPenyebab}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}><FiArrowLeft size={16} className="me-2" />Kembali</button>
                                    <button className="btn btn-primary" type="submit"><FiSave size={16} className="me-2" />Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

JenisPenyebabTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default JenisPenyebabTambahContent;
