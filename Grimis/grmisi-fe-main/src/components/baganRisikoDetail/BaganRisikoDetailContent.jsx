import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { useTranslate } from '@/utils/translate';
import FormBaganRisiko from './FormBaganRisiko';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

const BaganRisikoDetailContent = ({ title = "Detail Bagan Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { baganRisikoId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        deskripsi: '',
        tahun: 0,
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja,
    });
    const translate = useTranslate();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        setErrorMessage("")
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(API_ENDPOINTS.getBaganRisikoById(baganRisikoId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                deskripsi: response.data.deskripsi,
                tahun: response.data.tahun,
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
    }, [baganRisikoId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBack = () => {
        navigate('/parameters/bagan-risiko');
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }
    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <form >
                    <FormBaganRisiko
                        formData={formData}
                    />
                    <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

BaganRisikoDetailContent.propTypes = {
    title: PropTypes.string
};

export default BaganRisikoDetailContent;
