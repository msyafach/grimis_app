import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import Form from './Form';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';

setLanguage('id');

const KriteriaDampakDetailContent = ({ title = "Detail Kriteria Risiko Dampak" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { kriteriaDampakId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        kode: '',
        nama: '',
        nilai: 0,
        deskripsi: '',
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja,
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const response = await axios.get(API_ENDPOINTS.getKriteriaRisikoDampakById(kriteriaDampakId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                nilai: response.data.nilai,
                deskripsi: response.data.deskripsi,
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
    }, [kriteriaDampakId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBack = () => {
        navigate('/kriteria-risiko/dampak');
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
                            <form>
                                <Form
                                    formData={formData}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                                        <FiArrowLeft size={16} className="me-2" />
                                        Kembali
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

KriteriaDampakDetailContent.propTypes = {
    title: PropTypes.string,
};

export default KriteriaDampakDetailContent;
