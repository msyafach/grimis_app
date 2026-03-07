import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormKonteksProbis from './FormKonteksProbis';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

setLanguage('id');

const KonteksProbisEditContent = ({ title = "Edit Konteks Probis" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { konteksProbisId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [jenisKonteksProbis, setJenisKonteksProbis] = useState([]);
    const [selectedJenisKonteksProbis, setSelectedJenisKonteksProbis] = useState(null);
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_jenis_konteks": "",
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
                item.jenis_konteks.filter(k => k.jenis === 'PROBIS')
            );
            setJenisKonteksProbis(filtered);

            const response = await axios.get(API_ENDPOINTS.getKonteksProbisById(konteksProbisId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_jenis_konteks: response.data.id_jenis_konteks,
                id_instansi: response.data.id_instansi,
                id_induk_unit_kerja: response.data.id_induk_unit_kerja,
            });
            const selected = filtered.find(item => item.id === response.data.id_jenis_konteks);
            setSelectedJenisKonteksProbis({ label: selected.nama, value: selected.id });

        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [idIndukUnitKerja, idInstansi, konteksProbisId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputKonteksProbis = (e) => {
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
            
            await axios.put(API_ENDPOINTS.putKonteksProbis(konteksProbisId), submissionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            showToast("success", "Konteks Probis Berhasil Diperbarui!");
            fetchData();
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
        navigate('/parameters/konteks-probis');
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
                                <FormKonteksProbis
                                    formData={formData}
                                    handleInputKonteksProbis={handleInputKonteksProbis}
                                    jenisKonteksProbis={jenisKonteksProbis}
                                    selectedJenisKonteksProbis={selectedJenisKonteksProbis}
                                    setSelectedJenisKonteksProbis={setSelectedJenisKonteksProbis}
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

KonteksProbisEditContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default KonteksProbisEditContent;
