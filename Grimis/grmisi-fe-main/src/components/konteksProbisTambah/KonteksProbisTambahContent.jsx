import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormKonteksProbis from './FormKonteksProbis';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useAuth } from '@/context/AuthContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KonteksProbisTambahContent = ({ title = "Tambah Konteks Probis", resetKey }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
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
        "status_approval": isAdmin ? "TERVERIFIKASI" : "MENUNGGU_VERIFIKASI",
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchJenisKonteks = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                const strukturRes = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers });
                const filtered = strukturRes.data.flatMap(item =>
                    item.jenis_konteks.filter(k => k.jenis === 'PROBIS')
                );
                setJenisKonteksProbis(filtered);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };
        fetchJenisKonteks();
    }, [idIndukUnitKerja, idInstansi]);

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
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postKonteksProbis, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const successMessage = isAdmin ? "Konteks Probis Berhasil Ditambahkan!" : "Usulan Konteks Probis Berhasil Diajukan!";
            showToast("success", successMessage);
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };

    const handleBack = () => {
        navigate('/parameters/konteks-probis');
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

KonteksProbisTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default KonteksProbisTambahContent;
