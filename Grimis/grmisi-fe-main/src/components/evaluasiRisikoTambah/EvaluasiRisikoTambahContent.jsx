import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from "react-router-dom";
import PropTypes from 'prop-types';
import axios from 'axios';
import { Modal } from 'react-bootstrap';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { showToast } from '@/utils/toast';
import AkarPenyebabModal from './AkarPenyebabModal';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import CardIdentifikasiRisiko from './CardIdentifikasiRisiko';
import CardTambahAkarPenyebab from './CardTambahAkarPenyebab';
import CardDaftarAkarPenyebab from './CardDaftarAkarPenyebab';
import { validateIds } from '@/utils/validateIds';
import BowtieVisualization from '../evaluasiRisikoDetail/BowtieVisualization';

const EvaluasiRisikoTambahContent = ({ title = "Evaluasi Risiko", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { identifikasiId } = useParams();
    const { state } = useLocation();  // Get analisisId from state
    const analisisId = state?.analisisId;

    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();

    const [identifikasiRisiko, setIdentifikasiRisiko] = useState(null);
    const [dataJenisPenyebab, setDataJenisPenyebab] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);
    const [generatedRootCausesTambah, setGeneratedRootCausesTambah] = useState([]);
    const [generatedRootCausesEdit, setGeneratedRootCausesEdit] = useState([]);
    const [savedRootCauses, setSavedRootCauses] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteIndex, setDeleteIndex] = useState(null);
    const [deleteType, setDeleteType] = useState(null);
    const [tempEntries, setTempEntries] = useState([]);

    // Keep track of current edit mode
    const [currentEditIndex, setCurrentEditIndex] = useState(-1);

    // State for selected entries (already added to the form)
    const [selectedEntries, setSelectedEntries] = useState([]);

    // Base form data state
    const [formData, setFormData] = useState({
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
    const [selectedDampakEntries, setSelectedDampakEntries] = useState([]);
    const [selectedPenyebabEntries, setSelectedPenyebabEntries] = useState([]);

    const [generatingPdf, setGeneratingPdf] = useState(false);
    const bowtieRef = useRef(null);
    const [showBowtieModal, setShowBowtieModal] = useState(false);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
                if (!validationResult.valid) {
                    showToast("error", validationResult.message);
                    return;
                }

                const [jenisPenyebabRes, konteksRes, identifikasiRes, evaluasiRes, evaluasiDampakRes, evaluasiPenyebabRes] = await Promise.all([
                    axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getKonteksAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
                    axios.get(API_ENDPOINTS.getEvaluasiRisikoByIdentifikasi(identifikasiId), { headers }),
                    axios.get(API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiDampak(identifikasiId), { headers }),
                    axios.get(API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiPenyebab(identifikasiId), { headers }),
                ]);
                const identifikasiData = identifikasiRes.data;
                const konteksSasaranData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_sasaran);
                const konteksProbisData = konteksRes.data.find(item => item.id === identifikasiData.id_konteks_probis);

                setIdentifikasiRisiko({
                    ...identifikasiData,
                    konteks_sasaran: konteksSasaranData,
                    konteks_probis: konteksProbisData
                });

                setDataJenisPenyebab(jenisPenyebabRes.data);

                if (evaluasiRes.data && evaluasiRes.data.length > 0) {
                    // Make sure each entry has its evaluasi id 
                    const entriesWithIds = evaluasiRes.data.map(entry => ({
                        ...entry,
                        id: entry.id // Ensure the evaluasiId is preserved for updates
                    }));
                    setSelectedEntries(entriesWithIds);
                }

                setSelectedDampakEntries(
                    evaluasiDampakRes.data?.map(entry => ({ ...entry, id: entry.id })) || []
                );
                setSelectedPenyebabEntries(
                    evaluasiPenyebabRes.data?.map(entry => ({ ...entry, id: entry.id })) || []
                );
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [idInstansi, identifikasiId, analisisId, idIndukUnitKerja]);

    const handleGenerateRootCauses = async (forEdit = false) => {
        setLoadingGenerate(true);
        try {
            if (forEdit) {
                setGeneratedRootCausesTambah([]);
            } else {
                setGeneratedRootCausesEdit([]);
            }

            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                API_ENDPOINTS.postEvaluasiRisikoGenerate,
                {
                    identifikasi_risiko_id: identifikasiId,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const generationId = response.data.generation_id;

            const rootCauses = response.data.root_causes.map(rootCause => ({
                ...rootCause,
                generation_id: generationId,
                tag: 'Generated by AI'
            }));

            if (forEdit) {
                setGeneratedRootCausesEdit(rootCauses);
            } else {
                setGeneratedRootCausesTambah(rootCauses);
            }
        } catch (error) {
            console.error("Error generating root causes:", error);
            showToast('error', 'Gagal generate akar penyebab.');
        } finally {
            setLoadingGenerate(false);
        }
    };

    const handleSelectJenisPenyebab = (selectedOption) => {
        setSelectedJenisPenyebab(selectedOption);

        setFormData(prev => ({
            ...prev,
            jenis_penyebab_id: selectedOption?.value || ""
        }));
    };

    const handleRemoveTempEntry = (index) => {
        const updatedEntries = [...tempEntries];
        updatedEntries.splice(index, 1);
        setTempEntries(updatedEntries);
    };

    const handleConfirmDelete = (index) => {
        setDeleteIndex(index);
        setShowDeleteModal(true);
    };

    const handleDeleteEntry = async () => {
        if (deleteIndex === null || !deleteType) return;
        const entries = getEntryState(deleteType);
        const entry = entries[deleteIndex];

        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (entry.id) {
                const rtpRes = await axios.get(API_ENDPOINTS.getRtpbyEvaluasi(entry.id), { headers });
                const rtpId = rtpRes.data?.id;
                if (rtpId) {
                    await axios.delete(API_ENDPOINTS.deleteRtp(rtpId), { headers });
                }
                await axios.delete(API_ENDPOINTS.deleteEvaluasiRisikoById(entry.id), { headers });
            }

            const updated = [...entries];
            updated.splice(deleteIndex, 1);
            setEntryState(deleteType, updated);
            showToast('success', 'Data berhasil dihapus.');
        } catch (error) {
            console.error("Gagal menghapus data", error);
            showToast('error', 'Gagal menghapus data.');
        } finally {
            setShowDeleteModal(false);
            setDeleteIndex(null);
            setDeleteType(null);
        }
    };

    const handleClearTempEntries = () => {
        setTempEntries([]);
    };

    // Handle editing an entry field
    const handleEditEntry = (index, field, value) => {
        const newEntries = [...selectedEntries];
        newEntries[index][field] = value;
        setSelectedEntries(newEntries);
    };

    // Handle generating for a specific entry
    const handleGenerateForEntry = (index) => {
        setCurrentEditIndex(index);
        setFormData(prev => ({
            ...prev,
            jenis_penyebab_id: selectedEntries[index].jenis_penyebab_id
        }));

        handleGenerateRootCauses(true);
        setIsEditMode(true);
        setShowModal(true);
    };

    const handleSelectRootCause = (rootCause, forEdit = false) => {
        // Untuk mode edit, setelah memilih root cause, kita tutup modal
        if (forEdit) {
            setShowModal(false);
            const updatedEntries = [...selectedEntries];
            updatedEntries[currentEditIndex] = {
                ...updatedEntries[currentEditIndex],
                jenis: rootCause.jenis,
                deskripsi: rootCause.deskripsi,
                pengendalian: rootCause.pengendalian,
                jenis_pengendalian: rootCause.jenis_pengendalian,
                generation_id: rootCause.generation_id,
                root_cause_id: rootCause.id,
                jenis_penyebab_id: formData.jenis_penyebab_id
            };
            setSelectedEntries(updatedEntries);
            setCurrentEditIndex(-1);  // Reset index setelah edit
        } else {
            // Untuk mode tambah, kita simpan data sementara dan biarkan modal tetap terbuka
            setTempEntries(prev => {
                if (!prev.some(item => item.root_cause_id === rootCause.id)) {
                    return [...prev, {
                        jenis: rootCause.jenis,
                        deskripsi: rootCause.deskripsi,
                        pengendalian: rootCause.pengendalian,
                        jenis_pengendalian: rootCause.jenis_pengendalian,
                        generation_id: rootCause.generation_id,
                        root_cause_id: rootCause.id,
                        jenis_penyebab_id: selectedJenisPenyebab?.value || ''
                    }];
                }
                return prev;
            });
        }
    };

    const handleSaveEntry = async (index) => {
        const entry = selectedEntries[index];
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
        if (!validationResult.valid) {
            showToast("error", validationResult.message);
            return;
        }

        try {
            if (entry.id) {
                // UPDATE
                await axios.put(API_ENDPOINTS.putEvaluasiRisiko(entry.id), {
                    ...entry,
                    identifikasi_risiko_id: identifikasiId,
                    analisis_risiko_id: analisisId,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                }, { headers });
                showToast('success', 'Data berhasil diperbarui.');
            } else {
                // INSERT
                const res = await axios.post(API_ENDPOINTS.postEvaluasiRisiko, {
                    ...entry,
                    identifikasi_risiko_id: identifikasiId,
                    analisis_risiko_id: analisisId,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                }, { headers });
                showToast('success', 'Data baru berhasil disimpan.');

                // Update local state with new id
                const updatedEntries = [...selectedEntries];
                updatedEntries[index].id = res.data?.id;
                setSelectedEntries(updatedEntries);
            }
            // setGeneratedRootCausesEdit([]);
        } catch (error) {
            console.error("Gagal simpan per baris", error);
            showToast('error', 'Gagal menyimpan data.');
        }
    };

    const handleSaveManualEntry = async (entry) => {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const res = await axios.post(API_ENDPOINTS.postEvaluasiRisiko, {
                ...entry,
                identifikasi_risiko_id: identifikasiId,
                analisis_risiko_id: analisisId,
                id_instansi: idInstansi,
                id_induk_unit_kerja: idIndukUnitKerja,
            }, { headers });

            const evaluasiRisikoId = res.data?.id;
            await axios.post(API_ENDPOINTS.postRtpFromEvaluasi(evaluasiRisikoId), {}, { headers });

            showToast('success', 'Data berhasil disimpan.');
            setSelectedEntries(prev => [...prev, { ...entry, id: evaluasiRisikoId }]);
        } catch (error) {
            console.error("Gagal menyimpan entry manual", error);
            showToast('error', 'Gagal menyimpan data.');
        }
    };

    const handleSaveTempEntry = async () => {
        if (!tempEntries.length) return;
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
        if (!validationResult.valid) {
            showToast("error", validationResult.message);
            return;
        }

        try {
            const savedEntries = [];
            for (const entry of tempEntries) {
                const res = await axios.post(API_ENDPOINTS.postEvaluasiRisiko, {
                    ...entry,
                    identifikasi_risiko_id: identifikasiId,
                    analisis_risiko_id: analisisId,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                }, { headers });

                const evaluasiRisikoId = res.data?.id;
                await axios.post(API_ENDPOINTS.postRtpFromEvaluasi(evaluasiRisikoId), {}, { headers });

                savedEntries.push({ ...entry, id: res.data?.id });
                setTempEntries([]);
            }

            showToast('success', 'Semua data berhasil disimpan.');
            // setSelectedEntries([...selectedEntries, ...savedEntries]);
            const dampakEntries = savedEntries.filter(e => e.jenis?.toLowerCase() === 'dampak');
            const penyebabEntries = savedEntries.filter(e => e.jenis?.toLowerCase() === 'penyebab');

            // Tambahkan ke masing-masing state
            setSelectedDampakEntries(prev => [...prev, ...dampakEntries]);
            setSelectedPenyebabEntries(prev => [...prev, ...penyebabEntries]);

            setTempEntries([]);
            setSavedRootCauses(prev => [
                ...prev,
                ...savedEntries.map(entry => entry.root_cause_id)
            ]);
        } catch (error) {
            console.error("Gagal menyimpan data baru", error);
            showToast('error', 'Gagal menyimpan data.');
        } finally {
            setShowModal(false);
        }
    };

    const getEntryState = (type) => {
        return type === 'dampak' ? selectedDampakEntries : selectedPenyebabEntries;
    };

    const setEntryState = (type, data) => {
        if (type === 'dampak') {
            setSelectedDampakEntries(data);
        } else {
            setSelectedPenyebabEntries(data);
        }
    };

    const handleEditEntryByType = (type, index, field, value) => {
        const entries = [...getEntryState(type)];
        entries[index][field] = value;
        setEntryState(type, entries);
    };

    const handleSaveEntryByType = async (type, index) => {
        const entries = [...getEntryState(type)];
        const entry = entries[index];
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
        if (!validationResult.valid) {
            showToast("error", validationResult.message);
            return;
        }

        try {
            if (entry.id) {
                await axios.put(API_ENDPOINTS.putEvaluasiRisiko(entry.id), {
                    ...entry,
                    identifikasi_risiko_id: identifikasiId,
                    analisis_risiko_id: analisisId,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                }, { headers });
                showToast('success', 'Data berhasil diperbarui.');
            } else {
                const res = await axios.post(API_ENDPOINTS.postEvaluasiRisiko, {
                    ...entry,
                    identifikasi_risiko_id: identifikasiId,
                    analisis_risiko_id: analisisId,
                    id_instansi: idInstansi,
                    id_induk_unit_kerja: idIndukUnitKerja,
                }, { headers });
                entries[index].id = res.data?.id;
                showToast('success', 'Data berhasil disimpan.');
            }
            setEntryState(type, entries);
        } catch (error) {
            console.error("Gagal simpan entry", error);
            showToast('error', 'Gagal menyimpan data.');
        }
    };

    const handleRemoveEntryByType = (type, index) => {
        setDeleteIndex(index);
        setDeleteType(type);
        setShowDeleteModal(true);
    };

    const getEntryByType = (type, index) => {
        const entries = type === 'dampak' ? selectedDampakEntries : selectedPenyebabEntries;
        return entries?.[index] || null;
    };

    // Function to handle viewing the Bowtie diagram as PDF
    const handleViewPdf = async (refresh = false) => {
        if (generatingPdf) return;
        setGeneratingPdf(true);
        setShowBowtieModal(true);
        
        try {
            // If refresh is true, refresh the bowtie visualization first
            if (refresh && bowtieRef.current && bowtieRef.current.refresh) {
                bowtieRef.current.refresh();
            }
            
            // Wait for the component to be fully rendered
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (bowtieRef.current && bowtieRef.current.downloadPDF) {
                const success = await bowtieRef.current.downloadPDF();
                if (!success) {
                    showToast('error', 'Gagal membuat PDF.');
                }
            } else {
                showToast('error', 'Komponen Bowtie tidak tersedia.');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast('error', 'Gagal membuat PDF.');
        } finally {
            setGeneratingPdf(false);
            setShowBowtieModal(false);
        }
    };

    if (isRemoved) return null;

    if (loading || errorMessage) {
        return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
    }

    return (
        <>
            <CardIdentifikasiRisiko
                identifikasiRisiko={identifikasiRisiko}
                cardHeader={
                    <CardHeader
                        title={title}
                        refresh={handleRefresh}
                        remove={handleDelete}
                        expanded={handleExpand}
                    />
                }
            />

            <CardTambahAkarPenyebab
                dataJenisPenyebab={dataJenisPenyebab}
                selectedJenisPenyebab={selectedJenisPenyebab}
                generatedRootCausesTambah={generatedRootCausesTambah}
                onSelectJenis={handleSelectJenisPenyebab}
                onGenerate={() => {
                    handleGenerateRootCauses(false);
                    setShowModal(true);
                }}
                onShowModal={() => {
                    setShowModal(true);
                }}
                onSaveTempEntry={handleSaveTempEntry}
                tempEntries={tempEntries}
                onSaveManualEntry={handleSaveManualEntry}
                onRemoveTempEntry={handleRemoveTempEntry}
                onClearTempEntries={handleClearTempEntries}
                onUpdateTempEntries={setTempEntries}
                onViewPdf={handleViewPdf}
                generatingPdf={generatingPdf}
            />

            <CardDaftarAkarPenyebab
                title="Evaluasi Risiko Mengurangi Frekuensi"
                dataJenisPenyebab={dataJenisPenyebab}
                selectedEntries={selectedPenyebabEntries}
                generatedRootCausesEdit={generatedRootCausesEdit}
                tempEntries={tempEntries}
                onEditEntry={(i, f, v) => handleEditEntryByType('penyebab', i, f, v)}
                onSaveEntry={(i) => handleSaveEntryByType('penyebab', i)}
                onRemoveEntry={(i) => handleRemoveEntryByType('penyebab', i)}
                onGenerateForEntry={handleGenerateForEntry}
            />

            <CardDaftarAkarPenyebab
                title="Evaluasi Risiko Mengurangi Dampak"
                dataJenisPenyebab={dataJenisPenyebab}
                selectedEntries={selectedDampakEntries}
                generatedRootCausesEdit={generatedRootCausesEdit}
                tempEntries={tempEntries}
                onEditEntry={(i, f, v) => handleEditEntryByType('dampak', i, f, v)}
                onSaveEntry={(i) => handleSaveEntryByType('dampak', i)}
                onRemoveEntry={(i) => handleRemoveEntryByType('dampak', i)}
                onGenerateForEntry={handleGenerateForEntry}
                hideJenisPenyebab={true}
            />

            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">Konfirmasi Hapus</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteIndex !== null && deleteType && (() => {
                        const entry = getEntryByType(deleteType, deleteIndex);
                        const isPenyebab = entry?.jenis?.toLowerCase() === 'penyebab';
                        const jenisPenyebabLabel = isPenyebab
                            ? dataJenisPenyebab.find(jp => String(jp.id) === String(entry?.jenis_penyebab_id))?.nama
                            : null;

                        return (
                            <div className="mb-3">
                                <p>Apakah Anda yakin ingin menghapus data berikut?</p>
                                {isPenyebab && (
                                    <>
                                        <strong>Jenis Penyebab:</strong> {jenisPenyebabLabel || '-'}<br />
                                    </>
                                )}
                                <strong>Jenis:</strong> {entry?.jenis || '-'}<br />
                                <strong>Deskripsi:</strong> {entry?.deskripsi || '-'}<br />
                                <strong>Pengendalian:</strong> {entry?.pengendalian || '-'}<br />
                                <strong>Jenis Pengendalian:</strong> {entry?.jenis_pengendalian || '-'}<br />
                            </div>
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Batal</button>
                    <button className="btn btn-danger" onClick={handleDeleteEntry}>Hapus</button>
                </Modal.Footer>
            </Modal>

            {/* Hidden Bowtie Visualization for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', width: '1200px', height: '600px', overflow: 'hidden' }}>
                <BowtieVisualization 
                    ref={bowtieRef}
                    identifikasiId={identifikasiId}
                />
            </div>

            <AkarPenyebabModal
                setShowModal={setShowModal}
                show={showModal}
                onClose={() => {
                    setShowModal(false);
                    setCurrentEditIndex(-1);
                }}
                generatedRootCauses={
                    currentEditIndex >= 0
                        ? generatedRootCausesEdit
                        : generatedRootCausesTambah
                }
                loadingGenerate={loadingGenerate}
                onSelectAI={(rootCause) => handleSelectRootCause(rootCause, currentEditIndex >= 0)}
                selectedRootCauseId={
                    currentEditIndex >= 0
                        ? selectedEntries[currentEditIndex]?.root_cause_id
                        : null
                }
                tempEntries={tempEntries}
                currentEditIndex={currentEditIndex}
                isEditMode={isEditMode}
                savedRootCauses={savedRootCauses}
                onClearTempEntries={handleClearTempEntries}
            />
        </>
    );

};

EvaluasiRisikoTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default EvaluasiRisikoTambahContent;