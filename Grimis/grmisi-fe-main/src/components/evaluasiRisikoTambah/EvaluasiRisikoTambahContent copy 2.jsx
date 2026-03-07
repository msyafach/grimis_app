import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from "react-router-dom";
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { showToast } from '@/utils/toast';
import FormEvaluasiRisiko from './FormEvaluasiRisiko';
import AkarPenyebabModal from './AkarPenyebabModal';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import CardIdentifikasiRisiko from './CardIdentifikasiRisiko';
import CardTambahAkarPenyebab from './CardTambahAkarPenyebab';
import CardDaftarAkarPenyebab from './CardDaftarAkarPenyebab';

const EvaluasiRisikoTambahContent = ({ title = "Evaluasi Risiko", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { state } = useLocation();  // Get analisisId from state
    const analisisId = state?.analisisId;

    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();

    const [identifikasiRisiko, setIdentifikasiRisiko] = useState(null);
    const [dataJenisPenyebab, setDataJenisPenyebab] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);
    const [generatedRootCauses, setGeneratedRootCauses] = useState([]);
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [showModal, setShowModal] = useState(false);

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

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };

                const identifikasiRisikoResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId),
                    { headers }
                );
                setIdentifikasiRisiko(identifikasiRisikoResponse.data);

                const jenisPenyebabResponse = await axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi),
                    { headers }
                );
                setDataJenisPenyebab(jenisPenyebabResponse.data);

                // Fetch existing evaluasi risiko if we're in edit mode
                if (analisisId) {
                    const evaluasiResponse = await axios.get(API_ENDPOINTS.getEvaluasiRisikoByAnalasisSpes(analisisId),
                        { headers }
                    );

                    if (evaluasiResponse.data && evaluasiResponse.data.length > 0) {
                        // Make sure each entry has its evaluasi id 
                        const entriesWithIds = evaluasiResponse.data.map(entry => ({
                            ...entry,
                            id: entry.id // Ensure the evaluasiId is preserved for updates
                        }));
                        setSelectedEntries(entriesWithIds);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [idInstansi, identifikasiId, analisisId]);

    const handleGenerateRootCauses = async () => {
        setLoadingGenerate(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                API_ENDPOINTS.postEvaluasiRisikoGenerate,
                {
                    identifikasi_risiko_id: identifikasiId,
                    jenis_penyebab_id: formData.jenis_penyebab_id
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const generationId = response.data.generation_id;

            const rootCauses = response.data.root_causes.map(rootCause => ({
                ...rootCause,
                generation_id: generationId,
                tag: 'Generated by AI'
            }));

            setGeneratedRootCauses(rootCauses);
        } catch (error) {
            console.error("Error generating root causes:", error);
            showToast('error', 'Gagal generate akar penyebab.');
        } finally {
            setLoadingGenerate(false);
        }
    };

    // const handleSelectRootCause = (rootCause) => {
    //     // If editing an existing entry
    //     if (currentEditIndex >= 0) {
    //         const updatedEntries = [...selectedEntries];
    //         updatedEntries[currentEditIndex] = {
    //             ...updatedEntries[currentEditIndex],
    //             jenis: rootCause.jenis,
    //             deskripsi: rootCause.deskripsi,
    //             pengendalian: rootCause.pengendalian,
    //             jenis_pengendalian: rootCause.jenis_pengendalian,
    //             generation_id: rootCause.generation_id,
    //             root_cause_id: rootCause.id,
    //             jenis_penyebab_id: formData.jenis_penyebab_id
    //         };
    //         setSelectedEntries(updatedEntries);
    //     } else {
    //         // Adding a new entry
    //         setSelectedEntries([...selectedEntries, {
    //             jenis: rootCause.jenis,
    //             deskripsi: rootCause.deskripsi,
    //             pengendalian: rootCause.pengendalian,
    //             jenis_pengendalian: rootCause.jenis_pengendalian,
    //             generation_id: rootCause.generation_id,
    //             root_cause_id: rootCause.id,
    //             jenis_penyebab_id: formData.jenis_penyebab_id
    //         }]);
    //     }

    //     // Reset current edit index
    //     setCurrentEditIndex(-1);

    //     // Close modal
    //     setShowModal(false);
    // };

    const handleSelectJenisPenyebab = (selectedOption) => {
        setSelectedJenisPenyebab(selectedOption);

        setFormData(prev => ({
            ...prev,
            jenis_penyebab_id: selectedOption?.value || ""
        }));
    };



    // Handle removing an entry
    const handleRemoveEntry = (index) => {
        const newEntries = [...selectedEntries];
        newEntries.splice(index, 1);
        setSelectedEntries(newEntries);
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

        // Update formData with the jenis_penyebab_id from this entry
        setFormData(prev => ({
            ...prev,
            jenis_penyebab_id: selectedEntries[index].jenis_penyebab_id
        }));

        handleGenerateRootCauses();
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedEntries.length === 0) {
            showToast('error', 'Tambahkan minimal satu akar penyebab.');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            // Check if we're in edit mode (coming from an existing analisis)
            if (analisisId) {
                // This is an edit operation
                const entriesToUpdate = selectedEntries.filter(entry => entry.id);
                const entriesToCreate = selectedEntries.filter(entry => !entry.id);

                // Update existing entries
                for (const entry of entriesToUpdate) {
                    await axios.put(
                        API_ENDPOINTS.updateEvaluasiRisikoById(entry.id),
                        {
                            identifikasi_risiko_id: identifikasiId,
                            analisis_risiko_id: analisisId,
                            id_instansi: idInstansi,
                            id_induk_unit_kerja: idIndukUnitKerja,
                            jenis_penyebab_id: entry.jenis_penyebab_id,
                            jenis: entry.jenis,
                            deskripsi: entry.deskripsi,
                            pengendalian: entry.pengendalian,
                            jenis_pengendalian: entry.jenis_pengendalian,
                            generation_id: entry.generation_id,
                            root_cause_id: entry.root_cause_id
                        },
                        { headers }
                    );
                }

                // Create new entries if any
                if (entriesToCreate.length > 0) {
                    // Create each new entry one by one
                    for (const entry of entriesToCreate) {
                        await axios.post(
                            API_ENDPOINTS.postEvaluasiRisiko,
                            {
                                identifikasi_risiko_id: identifikasiId,
                                analisis_risiko_id: analisisId,
                                id_instansi: idInstansi,
                                id_induk_unit_kerja: idIndukUnitKerja,
                                jenis_penyebab_id: entry.jenis_penyebab_id,
                                jenis: entry.jenis,
                                deskripsi: entry.deskripsi,
                                pengendalian: entry.pengendalian,
                                jenis_pengendalian: entry.jenis_pengendalian,
                                generation_id: entry.generation_id,
                                root_cause_id: entry.root_cause_id
                            },
                            { headers }
                        );
                    }
                }

                showToast('success', 'Evaluasi Risiko berhasil diperbarui!');
            } else {
                // Create new data - Process each entry individually
                for (const entry of selectedEntries) {
                    await axios.post(
                        API_ENDPOINTS.postEvaluasiRisiko,
                        {
                            identifikasi_risiko_id: identifikasiId,
                            analisis_risiko_id: analisisId,
                            id_instansi: idInstansi,
                            id_induk_unit_kerja: idIndukUnitKerja,
                            jenis_penyebab_id: entry.jenis_penyebab_id,
                            jenis: entry.jenis,
                            deskripsi: entry.deskripsi,
                            pengendalian: entry.pengendalian,
                            jenis_pengendalian: entry.jenis_pengendalian,
                            generation_id: entry.generation_id || "",
                            root_cause_id: entry.root_cause_id || ""
                        },
                        { headers }
                    );
                }
                showToast('success', 'Evaluasi Risiko berhasil disimpan!');
            }

            resetKey(prev => prev + 1);
        } catch (error) {
            console.error("Error saving data:", error);
            const msg = error.response?.data?.message || 'Terjadi kesalahan saat menyimpan.';
            showToast('error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async (index) => {
        const entry = selectedEntries[index];
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (entry.id) {
                // UPDATE
                await axios.put(API_ENDPOINTS.updateEvaluasiRisikoById(entry.id), {
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
        } catch (error) {
            console.error("Gagal simpan per baris", error);
            showToast('error', 'Gagal menyimpan data.');
        }
    };

    const [tempEntry, setTempEntry] = useState(null);

    const handleSelectRootCause = (rootCause) => {
        if (currentEditIndex >= 0) {
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
            setCurrentEditIndex(-1);
        } else {
            // Simpan di state sementara (mode tambah)
            setTempEntry({
                jenis: rootCause.jenis,
                deskripsi: rootCause.deskripsi,
                pengendalian: rootCause.pengendalian,
                jenis_pengendalian: rootCause.jenis_pengendalian,
                generation_id: rootCause.generation_id,
                root_cause_id: rootCause.id,
                jenis_penyebab_id: formData.jenis_penyebab_id
            });
        }

        setShowModal(false);
    };

    const handleSaveTempEntry = async () => {
        if (!tempEntry) return;
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const res = await axios.post(API_ENDPOINTS.postEvaluasiRisiko, {
                ...tempEntry,
                identifikasi_risiko_id: identifikasiId,
                analisis_risiko_id: analisisId,
                id_instansi: idInstansi,
                id_induk_unit_kerja: idIndukUnitKerja,
            }, { headers });

            showToast('success', 'Data berhasil ditambahkan.');

            // Tambahkan ke daftar setelah berhasil post
            setSelectedEntries([...selectedEntries, { ...tempEntry, id: res.data?.id }]);
            setTempEntry(null);
        } catch (error) {
            console.error("Gagal menyimpan data baru", error);
            showToast('error', 'Gagal menyimpan data.');
        }
    };


    if (isRemoved) return null;

    return (
        <>
            <form onSubmit={handleSubmit}>
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
                    onSelectJenis={handleSelectJenisPenyebab}
                    onGenerate={() => {
                        handleGenerateRootCauses();
                        setShowModal(true);
                    }}
                    onSaveTempEntry={handleSaveTempEntry} // <-- Tambahan untuk simpan data sementara
                    tempEntry={tempEntry} // <-- Kirim entry yang sedang dipilih
                />

                <CardDaftarAkarPenyebab
                    dataJenisPenyebab={dataJenisPenyebab}
                    selectedEntries={selectedEntries}
                    onEditEntry={handleEditEntry}
                    onRemoveEntry={handleRemoveEntry}
                    onGenerateForEntry={handleGenerateForEntry}
                    onSaveEntry={handleSaveEntry}
                />

                <div className="d-flex justify-content-end gap-2 mb-4">
                    <button
                        type="button"
                        className="btn bg-soft-danger text-danger"
                        onClick={() => navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}`)}
                    >
                        <FiArrowLeft size={16} className="me-2" /> Kembali
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={selectedEntries.length === 0}
                    >
                        <FiSave size={16} className="me-2" /> Simpan Evaluasi Risiko
                    </button>
                </div>
            </form>

            <AkarPenyebabModal
                show={showModal}
                onClose={() => {
                    setShowModal(false);
                    setCurrentEditIndex(-1);
                }}
                generatedRootCauses={generatedRootCauses}
                loadingGenerate={loadingGenerate}
                onSelectAI={handleSelectRootCause}
                selectedRootCauseId={
                    currentEditIndex >= 0 ? selectedEntries[currentEditIndex]?.root_cause_id : null
                }
            />
        </>
    );

};

EvaluasiRisikoTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default EvaluasiRisikoTambahContent;