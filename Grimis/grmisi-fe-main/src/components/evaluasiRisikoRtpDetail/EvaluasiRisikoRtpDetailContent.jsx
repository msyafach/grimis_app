import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import FormEvaluasiRisikoRtp from './Form';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const EvaluasiRisikoRtpDetailContent = ({ title = "Detail RTP Evaluasi Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { idInstansi } = useInstansi();
    const { identifikasiId, rtpId } = useParams();
    const [evaluasiRisikoRtp, setEvaluasiRisikoRtp] = useState([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            const rtpRes = await axios.get(API_ENDPOINTS.getRtpById(rtpId), { headers });
            const rtpData = rtpRes.data;
            if (rtpRes.data.length === 0) {
                setErrorMessage('Silakan mengisi data evaluasi risiko terlebih dahulu.');
            }

            const [jenisPenyebabRes, konteksRes, identifikasiRes, evaluasiRes] = await Promise.all([
                axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), { headers }),
                axios.get(API_ENDPOINTS.getKonteksAll(idInstansi), { headers }),
                axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
                axios.get(API_ENDPOINTS.getEvaluasiRisikoById(rtpRes.data.evaluasi_risiko_id), { headers }),
            ]);
            const identifikasiData = identifikasiRes.data;
            const evaluasiData = evaluasiRes.data;
            const jenisPenyebabData = evaluasiData.jenis_penyebab_id
                ? jenisPenyebabRes.data.find(item => item.id === evaluasiData.jenis_penyebab_id)
                : null;
            const konteksSasaranData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_sasaran);
            const konteksProbisData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_probis);

            setEvaluasiRisikoRtp({
                ...rtpData,
                identifikasi: identifikasiData,
                evaluasi: evaluasiData,
                jenis_penyebab: jenisPenyebabData || null,
                konteks_sasaran: konteksSasaranData,
                konteks_probis: konteksProbisData
            });

        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [idInstansi, identifikasiId, rtpId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                {evaluasiRisikoRtp.length === 0 ? (
                    <div className="text-warning text-center">Silakan mengisi data Evaluasi terlebih dahulu.</div>
                ) : (
                    <form>
                        <FormEvaluasiRisikoRtp
                            evaluasiRisikoRtp={evaluasiRisikoRtp}
                        />
                    </form>
                )}
            </div>
        </div>
    );
};

EvaluasiRisikoRtpDetailContent.propTypes = {
    title: PropTypes.string
};

export default EvaluasiRisikoRtpDetailContent;
