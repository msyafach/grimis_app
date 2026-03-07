import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormKamusRisiko from './FormKamusRisiko';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KamusRisikoTambahContent = ({ title = "Tambah Kamus Risiko", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const [kategoriRisiko, setKategoriRisiko] = useState([]);
    const [selectedKategoriRisiko, setSelectedKategoriRisiko] = useState(null);
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_instansi": idInstansi,
        "id_kategori_risiko": "",
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getKategoriRisikoAll(idInstansi), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setKategoriRisiko(response.data);
                if (response.data.length === 0) {
                    setErrorMessage('Silakan mengisi data kategori risiko terlebih dahulu.');
                }
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi]);

    const handleInput = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSelectChange = (selectedOption) => {
        setSelectedKategoriRisiko(selectedOption);
        setFormData((prevState) => ({
            ...prevState,
            id_kategori_risiko: selectedOption ? selectedOption.value : null
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postKamusRisiko, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Kamus Risiko  Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/kamus-risiko');
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
                {kategoriRisiko.length === 0 ? (
                    <div className="text-warning text-center">Silakan mengisi data kategori risiko terlebih dahulu.</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <FormKamusRisiko
                            kategoriRisiko={kategoriRisiko}
                            selectedKategoriRisiko={selectedKategoriRisiko}
                            formData={formData}
                            handleInput={handleInput}
                            handleSelectChange={handleSelectChange}
                        />
                        <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                            <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                                <FiArrowLeft size={16} className="me-2" />Kembali
                            </button>
                            <button className="btn btn-primary" type="submit">
                                <FiSave size={16} className="me-2" />Simpan
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

KamusRisikoTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired
};

export default KamusRisikoTambahContent;
