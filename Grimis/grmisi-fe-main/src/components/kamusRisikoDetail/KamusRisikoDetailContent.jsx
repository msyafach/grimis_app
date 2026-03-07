import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import FormKamusRisiko from './FormKamusRisiko';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KamusRisikoDetailContent = ({ title = "Detail Kamus Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { kamusRisikoId } = useParams();
    const { idInstansi } = useInstansi();
    const [selectedKategoriRisiko, setSelectedKategoriRisiko] = useState(null);
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_instansi": idInstansi,
        "id_kategori_risiko": "",
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const kategoriRes = await axios.get(API_ENDPOINTS.getKategoriRisikoAll(idInstansi), { headers });
            const response = await axios.get(API_ENDPOINTS.getKamusRisikoById(kamusRisikoId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_kategori_risiko: response.data.id,
                id_instansi: response.data.id_instansi,
            });
            const selected = kategoriRes.data.find(item => item.id === response.data.id_kategori_risiko);
            setSelectedKategoriRisiko({ label: selected.nama, value: selected.id });

        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [idInstansi, kamusRisikoId]);

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
                <form >
                    <FormKamusRisiko
                        selectedKategoriRisiko={selectedKategoriRisiko}
                        formData={formData}
                    />
                </form>
            </div>
        </div>
    );
};

KamusRisikoDetailContent.propTypes = {
    title: PropTypes.string
};

export default KamusRisikoDetailContent;
