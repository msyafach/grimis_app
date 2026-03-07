import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const JenisPenyebabDetailContent = ({ title = "Detail Jenis Penyebab" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { jenisPenyebabId } = useParams();
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
    }, [jenisPenyebabId]);

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
                            <form >
                                <div className="col-lg-6">
                                    <div className="mb-4">
                                        <label className="form-label">Kode <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4 bg-light"
                                            name="kode"
                                            placeholder="Kode"
                                            value={formData.kode}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div className="mb-4">
                                        <label className="form-label">Nama <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4 bg-light"
                                            name="nama"
                                            placeholder="Nama"
                                            value={formData.nama}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

JenisPenyebabDetailContent.propTypes = {
    title: PropTypes.string
};

export default JenisPenyebabDetailContent;
