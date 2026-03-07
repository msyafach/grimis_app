import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormKriteriaKemungkinan from './Form';
import { useInstansi } from '../../context/InstansiContext';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const KriteriaKemungkinanTambahContent = ({ title = "Tambah Kriteria Risiko Kemungkinan", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [identifikasiRisiko, setIdentifikasiRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState(null);
    const [formData, setFormData] = useState({
        "status": "",
        "catatan": "",
        "type": "IDENTIFIKASI",
        "data": {},
        "id_identifikasi_risiko": ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const identifikasiResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoSummary(idInstansi, tahunId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setIdentifikasiRisiko(identifikasiResponse.data)
            } catch (error) {
                console.error("Error fetching data:", error);
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleInput = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSelectChange = (name, option) => {
        const value = option?.value || '';
        let updatedFields = { [name]: value };

        switch (name) {
            case 'id_jenis_konteks_sasaran':
                setSelectedJenisKonteksSasaran(option);
                break;
            case 'id_konteks_sasaran':
                setSelectedKontekSasaran(option);
                break;
            case 'id_konteks_probis':
                setSelectedKontekProbis(option);
                break;
            case 'id_indikator':
                setSelectedIndikator(option);
                break;
            case 'id_kamus': {
                setSelectedKamus(option);
                const kategori = kamus.find(k => k.id === option?.value);
                if (kategori) {
                    setSelectedKategoriRisiko({ label: kategori.nama_kategori, value: kategori.id_kategori_risiko });
                    updatedFields.id_kategori_risiko = kategori.id_kategori_risiko;
                    updatedFields.pernyataan_risiko = option?.label || '';
                }
                break;
            }
            default:
                break;
        }

        setFormData(prev => ({
            ...prev,
            ...updatedFields
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postKriteriaRisikoKemungkinan, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Kriteria Risiko Kemungkinan Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };

    const handleBack = () => {
        navigate('/kriteria-risiko/kemungkinan');
    };

    if (isRemoved) return null;

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="col-12">
                            <form onSubmit={handleSubmit}>
                                <FormKriteriaKemungkinan
                                    identifikasiRisiko={identifikasiRisiko}
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleInput={handleInput}
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

KriteriaKemungkinanTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default KriteriaKemungkinanTambahContent;
