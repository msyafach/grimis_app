import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormEvaluasiRisikoRtp from './Form';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateIds } from '@/utils/validateIds';

setLanguage('id');

const EvaluasiRisikoRtpTambahContent = ({ title = "Tambah RTP Evaluasi Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { state } = useLocation();
    const analisisId = state?.analisisId;
    const [evaluasiRisikoRtp, setEvaluasiRisikoRtp] = useState([]);
    const [evaluasiRisiko, setEvaluasiRisiko] = useState([]);
    const [selectedEvaluasiRisiko, setSelectedEvaluasiRisiko] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);
    const [isByAI, setIsByAI] = useState(false);
    const [formDataRtp, setFormDataRtp] = useState({
        deskripsi: "",
        respon_risiko: "",
        rencana_aksi: "",
        target_waktu: new Date().toISOString().split('T')[0],
        pic: "",
        indikator: "",
        output: "",
        anggaran: 0
    });
    const [formDataEvaluasi, setFormDataEvaluasi] = useState({
        identifikasi_risiko_id: identifikasiId,
        analisis_risiko_id: analisisId,
        jenis_penyebab_id: "",
        deskripsi: "",
        jenis: "",
        pengendalian: "",
        jenis_pengendalian: "",
        generation_id: "",
        root_cause_id: "",
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }
            const [identifikasiRes, evaluasiRes, jenisPenyebabRes, konteksRes] = await Promise.all([
                axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
                axios.get(API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiSpes(identifikasiId), { headers }),
                axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), { headers }),
                axios.get(API_ENDPOINTS.getKonteksAll(idInstansi), { headers }),
            ]);
            const identifikasiData = identifikasiRes.data;
            const evaluasiData = evaluasiRes.data;
            const konteksSasaranData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_sasaran);
            const konteksProbisData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_probis);

            setEvaluasiRisiko(evaluasiData)
            const jenisPenyebabData = jenisPenyebabRes.data;

            setEvaluasiRisikoRtp({
                identifikasi: identifikasiData,
                jenis_penyebab: jenisPenyebabData,
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
    }, [idIndukUnitKerja, idInstansi, identifikasiId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedEvaluasiRisiko?.value) {
            const selected = evaluasiRisiko.find(ev => ev.id === selectedEvaluasiRisiko.value);
            if (selected) {
                setFormDataEvaluasi({
                    ...selected,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                    rtp_count: selected.rtp_count ?? 0
                });

                const jenisPenyebab = evaluasiRisikoRtp.jenis_penyebab?.find(item => item.id === selected.jenis_penyebab_id);
                setSelectedJenisPenyebab({ label: jenisPenyebab?.nama || '-', value: jenisPenyebab?.id });
            }
        }
    }, [selectedEvaluasiRisiko, evaluasiRisiko, evaluasiRisikoRtp, idInstansi, idIndukUnitKerja, evaluasiRisikoRtp.jenis_penyebab]);


    console.log(selectedEvaluasiRisiko)

    const handleInput = (e) => {
        const { name, value } = e.target;
        setFormDataRtp(prev => ({ ...prev, [name]: value }));
    };

    const handleDateInput = (e) => {
        const { name, value } = e.target;
        setFormDataRtp(prev => ({ ...prev, [name]: value }));
    };

    const handleInputEvaluasi = (e) => {
        const { name, value } = e.target;
        setFormDataEvaluasi(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (selectedOption) => {
        setSelectedEvaluasiRisiko(selectedOption);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        
        try {
            const token = localStorage.getItem("access_token");
            const headers = { Authorization: `Bearer ${token}` };
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }

            // Validate target_waktu format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(formDataRtp.target_waktu)) {
                showToast("error", "Target waktu harus dalam format YYYY-MM-DD");
                setLoading(false);
                return;
            }

            // Ensure all required fields are present and properly formatted
            if (!isByAI && (!formDataRtp.deskripsi || !formDataRtp.rencana_aksi || 
                !formDataRtp.target_waktu || !formDataRtp.pic || !formDataRtp.indikator || 
                !formDataRtp.output || formDataRtp.respon_risiko === "")) {
                showToast("error", "Harap lengkapi semua field yang diperlukan");
                setLoading(false);
                return;
            }

            if (!formDataEvaluasi.id) {
                showToast("error", "Pilih evaluasi risiko terlebih dahulu");
                setLoading(false);
                return;
            }

            if (isByAI) {
                await axios.post(API_ENDPOINTS.postRtpFromEvaluasi(formDataEvaluasi.id), {}, { headers });
            } else {
                // Prepare data to match the API's expected schema
                const rtpData = {
                    evaluasi_risiko_id: formDataEvaluasi.id,
                    deskripsi: formDataRtp.deskripsi,
                    respon_risiko: formDataRtp.respon_risiko,
                    rencana_aksi: formDataRtp.rencana_aksi,
                    target_waktu: `${formDataRtp.target_waktu}T00:00:00`, // Add time component
                    pic: formDataRtp.pic,
                    indikator: formDataRtp.indikator,
                    output: formDataRtp.output,
                    anggaran: parseFloat(formDataRtp.anggaran) || 0 // Ensure it's a number
                };
                
                console.log("Submitting RTP data:", rtpData);
                
                await axios.post(API_ENDPOINTS.postRtp, rtpData, { headers });
                
                setFormDataRtp({
                    deskripsi: "",
                    respon_risiko: "",
                    rencana_aksi: "",
                    target_waktu: new Date().toISOString().split('T')[0],
                    pic: "",
                    indikator: "",
                    output: "",
                    anggaran: 0
                });
            }
            
            fetchData();
            showToast("success", "Evaluasi Risiko RTP Berhasil Diperbarui!");
        } catch (error) {
            console.error("Error submitting RTP:", error.response?.data || error);
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/rtp`, {
            state: { analisisId }
        });
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
                    <form onSubmit={handleSubmit}>
                        <FormEvaluasiRisikoRtp
                            evaluasiRisiko={evaluasiRisiko}
                            selectedEvaluasiRisiko={selectedEvaluasiRisiko}
                            evaluasiRisikoRtp={evaluasiRisikoRtp}
                            selectedJenisPenyebab={selectedJenisPenyebab}
                            formDataRtp={formDataRtp}
                            formDataEvaluasi={formDataEvaluasi}
                            handleInput={handleInput}
                            handleInputEvaluasi={handleInputEvaluasi}
                            handleSelectChange={handleSelectChange}
                            isByAI={isByAI}
                            setIsByAI={setIsByAI}
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
                </div>
            </div>
        </>
    );
};

EvaluasiRisikoRtpTambahContent.propTypes = {
    title: PropTypes.string
};

export default EvaluasiRisikoRtpTambahContent;
