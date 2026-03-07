import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import FormKonteksSasaran from './FormKonteksSasaran';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KonteksSasaranDetailContent = ({ title = "Detail Konteks Sasaran" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { konteksSasaranId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
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
                const headers = { Authorization: `Bearer ${token}` };
                const strukturRes = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers });
                const filtered = strukturRes.data.flatMap(item =>
                    item.jenis_konteks.filter(k => k.jenis === 'SASARAN')
                );

                const response = await axios.get(API_ENDPOINTS.getKonteksSasaranById(konteksSasaranId), { headers });
                setFormData({
                    kode: response.data.kode,
                    nama: response.data.nama,
                    id_jenis_konteks: response.data.id,
                    id_instansi: response.data.id_instansi,
                    id_induk_unit_kerja: response.data.id_induk_unit_kerja,
                });
                const selected = filtered.find(item => item.id === response.data.id_jenis_konteks);
                setSelectedJenisKonteksSasaran({ label: selected.nama, value: selected.id });

            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse)
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [idIndukUnitKerja, idInstansi, konteksSasaranId]);

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
                                <FormKonteksSasaran
                                    formData={formData}
                                    selectedJenisKonteksSasaran={selectedJenisKonteksSasaran}
                                />
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

KonteksSasaranDetailContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default KonteksSasaranDetailContent;
