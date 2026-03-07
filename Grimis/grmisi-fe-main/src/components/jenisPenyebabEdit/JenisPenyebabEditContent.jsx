import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

setLanguage('id');

const JenisPenyebabEditContent = ({ title = "Edit Jenis Penyebab" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { jenisPenyebabId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        id_instansi: '',
        id_induk_unit_kerja: '',
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
            
            // Fetch the jenis penyebab data
            const response = await axios.get(API_ENDPOINTS.getJenisPenyebabById(jenisPenyebabId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_instansi: response.data.id_instansi,
                id_induk_unit_kerja: response.data.id_induk_unit_kerja,
            });
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [jenisPenyebabId, idInstansi]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem('access_token');
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
            
            await axios.put(API_ENDPOINTS.updateJenisPenyebab(jenisPenyebabId), submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            fetchData();
            showToast('success', 'Jenis Penyebab Berhasil Diperbarui!');
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
            showToast("error", errorResponse);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/jenis-penyebab');
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
                                <div className="row">
                                    <div className="col-lg-6">
                                        <div className="mb-4">
                                            <label className="form-label">Kode <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm rounded-4 bg-light"
                                                name="kode"
                                                placeholder="Kode"
                                                value={formData.kode}
                                                onChange={handleInputChange}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-6">
                                        <div className="mb-4">
                                            <label className="form-label">Nama <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm rounded-4"
                                                name="nama"
                                                placeholder="Nama"
                                                value={formData.nama}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button className="btn btn-primary" type="submit">
                                        <FiSave size={16} className="me-2" />Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

JenisPenyebabEditContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default JenisPenyebabEditContent;
