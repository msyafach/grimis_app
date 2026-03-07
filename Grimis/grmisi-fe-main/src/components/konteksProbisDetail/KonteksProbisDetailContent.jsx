import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { translate, setLanguage } from '@/utils/i18n';
import FormKonteksProbis from './FormKonteksProbis';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KonteksProbisDetailContent = ({ title = "Detail Konteks Probis" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { konteksProbisId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
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
            const headers = { Authorization: `Bearer ${token}` };
            const strukturRes = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers });
            const filtered = strukturRes.data.flatMap(item =>
                item.jenis_konteks.filter(k => k.jenis === 'PROBIS')
            );

            const response = await axios.get(API_ENDPOINTS.getKonteksProbisById(konteksProbisId), { headers });
            setFormData({
                kode: response.data.kode,
                nama: response.data.nama,
                id_jenis_konteks: response.data.id,
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
                                <FormKonteksProbis
                                    formData={formData}
                                    selectedJenisKonteksProbis={selectedJenisKonteksProbis}
                                />
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

KonteksProbisDetailContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default KonteksProbisDetailContent;
