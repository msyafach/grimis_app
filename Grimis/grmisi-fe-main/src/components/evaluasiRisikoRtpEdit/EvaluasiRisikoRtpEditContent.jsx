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
import AkarPenyebabModal from './AkarPenyebabModal';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateIds } from '@/utils/validateIds';

setLanguage('id');

const EvaluasiRisikoRtpContent = ({ title = "Edit RTP Evaluasi Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { identifikasiId, rtpId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { state } = useLocation();
    const analisisId = state?.analisisId;
    const [isJenisDampak, setIsJenisDampak] = useState(false);
    const [evaluasiRisikoRtp, setEvaluasiRisikoRtp] = useState([]);
    const [jenisPenyebab, setJenisPenyebab] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);
    const [generatedRootCausesEdit, setGeneratedRootCausesEdit] = useState([]);
    const [isByAIEvaluasi, setIsByAIEvaluasi] = useState(false);
    const [isByAI, setIsByAI] = useState(false);

    const [formDataRtp, setFormDataRtp] = useState({
        deskripsi: "",
        respon_risiko: "",
        rencana_aksi: "",
        target_waktu: "",
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
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showModal, setShowModal] = useState(false);

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

            setIsJenisDampak(evaluasiData.jenis === 'dampak');
            setJenisPenyebab(jenisPenyebabRes.data)
            if (jenisPenyebabData) {
                setSelectedJenisPenyebab({ label: jenisPenyebabData.nama, value: jenisPenyebabData.id });
            }

            setEvaluasiRisikoRtp({
                ...rtpData,
                identifikasi: identifikasiData,
                evaluasi: evaluasiData,
                jenis_penyebab: jenisPenyebabData || null,
                konteks_sasaran: konteksSasaranData,
                konteks_probis: konteksProbisData
            });

            setFormDataRtp({
                deskripsi: rtpData.deskripsi,
                respon_risiko: rtpData.respon_risiko,
                rencana_aksi: rtpData.rencana_aksi,
                target_waktu: rtpData.target_waktu,
                pic: rtpData.pic,
                indikator: rtpData.indikator,
                output: rtpData.output,
                anggaran: rtpData.anggaran
            });

            setFormDataEvaluasi({
                identifikasi_risiko_id: evaluasiData.identifikasi_risiko_id,
                analisis_risiko_id: evaluasiData.analisis_risiko_id,
                jenis_penyebab_id: evaluasiData.jenis_penyebab_id,
                deskripsi: evaluasiData.deskripsi,
                jenis: evaluasiData.jenis,
                pengendalian: evaluasiData.pengendalian,
                jenis_pengendalian: evaluasiData.jenis_pengendalian,
                generation_id: evaluasiData.generation_id,
                root_cause_id: evaluasiData.root_cause_id,
                id_instansi: evaluasiData.id_instansi,
                id_induk_unit_kerja: evaluasiData.id_induk_unit_kerja
            });

        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [idIndukUnitKerja, idInstansi, identifikasiId, rtpId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateRootCauses = async () => {
        setLoadingGenerate(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                API_ENDPOINTS.postEvaluasiRisikoGenerate,
                {
                    identifikasi_risiko_id: identifikasiId,
                    jenis_penyebab_id: formDataEvaluasi.jenis_penyebab_id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const generationId = response.data.generation_id;
            const rootCauses = response.data.root_causes.map(rootCause => ({
                ...rootCause,
                generation_id: generationId,
                tag: 'Generated by AI'
            }));
            setGeneratedRootCausesEdit(rootCauses);
        } catch (error) {
            console.error("Error generating root causes:", error);
            showToast('error', 'Gagal generate akar penyebab.');
        } finally {
            setLoadingGenerate(false);
        }
    };
    const handleGenerateForEntry = () => {
        handleGenerateRootCauses(true);
        setShowModal(true);
    };

    const createInputHandler = (setState) => (e) => {
        const { name, value } = e.target;
        setState(prev => ({ ...prev, [name]: value }));
    };
    const handleInput = createInputHandler(setFormDataRtp);
    const handleInputEvaluasi = createInputHandler(setFormDataEvaluasi);

    const handleSelectChange = (selectedOption) => {
        setSelectedJenisPenyebab(selectedOption);
        setFormDataEvaluasi((prevState) => ({
            ...prevState,
            jenis_penyebab_id: selectedOption ? selectedOption.value : null
        }));
    };

    const handleSelectRootCause = (rootCause) => {
        setShowModal(false);
        setFormDataEvaluasi(prev => ({
            ...prev,
            jenis: rootCause.jenis,
            deskripsi: rootCause.deskripsi,
            pengendalian: rootCause.pengendalian,
            jenis_pengendalian: rootCause.jenis_pengendalian,
            generation_id: rootCause.generation_id,
            root_cause_id: rootCause.id,
            jenis_penyebab_id: formDataEvaluasi.jenis_penyebab_id
        }));
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
            if (isByAI) {
                const finalFormDataEvaluasi = { ...formDataEvaluasi };
                if (isJenisDampak) {
                    delete finalFormDataEvaluasi.jenis_penyebab_id;
                }
                const evaluasiRes = await axios.put(API_ENDPOINTS.putEvaluasiRisiko(evaluasiRisikoRtp.evaluasi.id), finalFormDataEvaluasi, { headers });
                await axios.delete(API_ENDPOINTS.deleteRtp(rtpId), { headers });
                const rtpRes = await axios.post(API_ENDPOINTS.postRtpFromEvaluasi(evaluasiRes.data.id), {}, { headers });
                navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/rtp/edit/${rtpRes.data.id}`, {
                    state: { analisisId }
                });
            } else {
                const finalFormDataEvaluasi = { ...formDataEvaluasi };
                if (isJenisDampak) {
                    delete finalFormDataEvaluasi.jenis_penyebab_id;
                }
                await axios.put(API_ENDPOINTS.putEvaluasiRisiko(evaluasiRisikoRtp.evaluasi.id), finalFormDataEvaluasi, { headers });
                await axios.put(API_ENDPOINTS.putRtp(rtpId), formDataRtp, { headers });
            }
            showToast("success", "Evaluasi Risiko RTP Berhasil Diperbarui!");
        } catch (error) {
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

    console.log(evaluasiRisikoRtp)
    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    {evaluasiRisikoRtp.length === 0 ? (
                        <div className="text-warning text-center">Silakan mengisi data Evaluasi Risiko terlebih dahulu.</div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FormEvaluasiRisikoRtp
                                isJenisDampak={isJenisDampak}
                                evaluasiRisikoRtp={evaluasiRisikoRtp}
                                jenisPenyebab={jenisPenyebab}
                                selectedJenisPenyebab={selectedJenisPenyebab}
                                formDataRtp={formDataRtp}
                                formDataEvaluasi={formDataEvaluasi}
                                handleInput={handleInput}
                                handleInputEvaluasi={handleInputEvaluasi}
                                handleSelectChange={handleSelectChange}
                                isByAIEvaluasi={isByAIEvaluasi}
                                setIsByAIEvaluasi={setIsByAIEvaluasi}
                                isByAI={isByAI}
                                setIsByAI={setIsByAI}
                                generatedRootCausesEdit={generatedRootCausesEdit}
                                onGenerateForEntry={handleGenerateForEntry}
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

            <AkarPenyebabModal
                show={showModal}
                onClose={() => setShowModal(false)}
                generatedRootCauses={generatedRootCausesEdit}
                loadingGenerate={loadingGenerate}
                onSelectAI={handleSelectRootCause}
                selectedRootCauseId={formDataEvaluasi.root_cause_id}
            />
        </>
    );
};

EvaluasiRisikoRtpContent.propTypes = {
    title: PropTypes.string
};

export default EvaluasiRisikoRtpContent;
