import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { translate, setLanguage } from '@/utils/i18n';
import FormIndikatorKonteks from './FormIndikatorKonteks';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const IndikatorKonteksEditContent = ({ title = "Detail Indikator" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { indikatorId } = useParams();
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
                                <FormIndikatorKonteks
                                    formData={formData}
                                    setFormData={setFormData}
                                />
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
