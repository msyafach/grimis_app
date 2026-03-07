import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormKonteksSasaran from './FormKonteksSasaran';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

setLanguage('id');

const KonteksSasaranEditContent = ({ title = "Edit Konteks Sasaran", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { konteksSasaranId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [jenisKonteksSasaran, setJenisKonteksSasaran] = useState([]);
    const [selectedJenisKonteksSasaran, setSelectedJenisKonteksSasaran] = useState(null);
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        id_jenis_konteks: '',
        id_instansi: '',
        id_induk_unit_kerja: '',
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
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
                
                // Validate induk unit kerja ID if available
                if (idIndukUnitKerja) {
                    const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                    if (!indukUnitValidation.valid) {
                        console.warn("Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi");
                    }
                }
                
                const headers = { Authorization: `Bearer ${token}` };
                const strukturRes = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers });
                const filtered = strukturRes.data.flatMap(item =>
                    item.jenis_konteks.filter(k => k.jenis === 'SASARAN')
                );
                setJenisKonteksSasaran(filtered);

                const response = await axios.get(API_ENDPOINTS.getKonteksSasaranById(konteksSasaranId), { headers });
                setFormData({
                    kode: response.data.kode,
                    nama: response.data.nama,
                    id_jenis_konteks: response.data.id_jenis_konteks,
                    id_instansi: response.data.id_instansi,
                    id_induk_unit_kerja: response.data.id_induk_unit_kerja,
                });
                const selected = filtered.find(item => item.id === response.data.id_jenis_konteks);
                setSelectedJenisKonteksSasaran({ label: selected.nama, value: selected.id });

            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [idIndukUnitKerja, idInstansi, konteksSasaranId]);

    const handleInputKonteksSasaran = (e) => {
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
            
            await axios.put(API_ENDPOINTS.updateKonteksSasaran(konteksSasaranId), submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            showToast("success", "Konteks Sasaran Berhasil Diperbarui!");
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            setErrorMessage(translatedError);
            showToast("error", translatedError);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/konteks-sasaran');
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
                                <FormKonteksSasaran
                                    formData={formData}
                                    handleInputKonteksSasaran={handleInputKonteksSasaran}
                                    jenisKonteksSasaran={jenisKonteksSasaran}
                                    selectedJenisKonteksSasaran={selectedJenisKonteksSasaran}
                                    setSelectedJenisKonteksSasaran={setSelectedJenisKonteksSasaran}
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

KonteksSasaranEditContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default KonteksSasaranEditContent;
