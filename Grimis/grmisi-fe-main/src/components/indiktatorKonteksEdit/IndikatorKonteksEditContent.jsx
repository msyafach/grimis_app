import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { translate, setLanguage } from '@/utils/i18n';
import FormIndikatorKonteks from './FormIndikatorKonteks';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const IndikatorKonteksEditContent = ({ title = "Edit Indikator" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { konteksSasaranId, indikatorId } = useParams();
    const { idInstansi } = useInstansi();
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        id_konteks: '',
        id_instansi: '',
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(API_ENDPOINTS.getIndikatorById(indikatorId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_konteks: response.data.id,
                id_instansi: response.data.id_instansi,
            });
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [indikatorId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputIndikatorKonteks = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
            id_konteks: konteksSasaranId,
            id_instansi: idInstansi,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            await axios.put(API_ENDPOINTS.putIndikator(indikatorId), formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Indikator Berhasil Diperbarui!");
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };

    const handleBack = () => {
        navigate(`/parameters/konteks-sasaran/indikator/${konteksSasaranId}`);
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
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
                                <FormIndikatorKonteks
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleInputIndikatorKonteks={handleInputIndikatorKonteks}
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

IndikatorKonteksEditContent.propTypes = {
    title: PropTypes.string,
};


export default IndikatorKonteksEditContent;
