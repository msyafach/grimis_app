import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import { showToast } from '@/utils/toast';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import FormUnitKerja from './FormUnitKerja';
import FormJenisKonteks from './FormJenisKonteks';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

const StrukturOrganisasiTambahContent = ({ title = "Tambah Struktur Organisasi", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [lokasiData, setLokasiData] = useState([]);
    const [selectedProvinsi, setSelectedProvinsi] = useState(null);
    const [selectedKota, setSelectedKota] = useState(null);
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState(null);
    const [dataIndukUnitKerja, setDataIndukUnitKerja] = useState([]);

    // Add state for sasaran and probis data
    const [sasaranData, setSasaranData] = useState([
        { kode: '', nama: '', jenis: 'SASARAN' }
    ]);
    const [probisData, setProbisData] = useState([
        { kode: '', nama: '', jenis: 'PROBIS' }
    ]);

    const [formData, setFormData] = useState({
        kode: '',
        kode_induk: null,
        nama: '',
        nama_pendek: '',
        selera_risiko: 0,
        provinsi: '',
        pimpinan: '',
        jabatan_pimpinan: '',
        kota: '',
        id_induk_unit_kerja: '',
        id_instansi: idInstansi,
        jenis_konteks: [] // Empty array, will be populated from sasaranData and probisData
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchLokasi = async () => {
            const response = await fetch('/data/ref_lokasi.json');
            const data = await response.json();
            setLokasiData(data);
        };
        fetchLokasi();
    }, []);

    const provinsiOptions = lokasiData.map((prov) => ({
        label: String(prov.nama),
        value: String(prov.kode),
    }));
    const filteredKota = selectedProvinsi
        ? lokasiData.find(p => p.kode === selectedProvinsi.value)?.kotakab.map(kota => ({
            label: kota.nama,
            value: kota.kode,
        })) || []
        : [];

    useEffect(() => {
        const fetchIndukUnitKerja = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');

                // Validate instansi ID before using it
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                // Check indukUnitKerja if provided
                if (idIndukUnitKerja) {
                    const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                    if (!indukUnitValidation.valid) {
                        console.warn("Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi");
                    }
                }

                const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasibyInstansi(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDataIndukUnitKerja(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };
        fetchIndukUnitKerja();
    }, [idIndukUnitKerja, idInstansi]);

    // Update formData when idInstansi changes
    useEffect(() => {
        setFormData(prevState => ({
            ...prevState,
            id_instansi: idInstansi
        }));
    }, [idInstansi]);

    const handleUnitKerjaChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value
        }));
    };

    const handleSasaranChange = (updatedSasaran) => {
        setSasaranData(updatedSasaran);
    };

    const handleProbisChange = (updatedProbis) => {
        setProbisData(updatedProbis);
    };

    // Remove the auto-generation of jenis konteks
    const handleJabatanChange = (e) => {
        const jabatan = e.target.value;
        setFormData(prevState => ({
            ...prevState,
            jabatan_pimpinan: jabatan
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        if (!selectedIndukUnitKerja || !selectedProvinsi || !selectedKota) {
            setLoading(false);
            showToast("error", "Semua input wajib dipilih!");
            return;
        }

        try {
            const token = localStorage.getItem('access_token');

            // Validate instansi ID before submitting
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                setErrorMessage(instansiValidation.message);
                setLoading(false);
                return;
            }

            const noInduk = selectedIndukUnitKerja?.value === null;

            // Combine sasaranData and probisData for submission
            const combinedJenisKonteks = [...sasaranData, ...probisData].filter(item => item.kode && item.nama);

            const submissionData = {
                ...formData,
                id_induk_unit_kerja: selectedIndukUnitKerja.value,
                provinsi: selectedProvinsi.label,
                kota: selectedKota.label,
                kode_induk: noInduk ? null : selectedIndukUnitKerja.kode_induk || null,
                jenis_konteks: combinedJenisKonteks
            };

            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.post(API_ENDPOINTS.postStrukturOrganisasi, submissionData, { headers });

            // Check if we have a response with data
            if (res.data) {
                // Try to get the newly created induk unit kerja ID
                let newIndukUnitKerjaId = res.data.id_induk_unit_kerja;

                // If we have a valid induk unit kerja ID, create risk criteria for it
                if (newIndukUnitKerjaId) {
                    console.log("Creating template for new induk unit kerja:", newIndukUnitKerjaId);

                    try {
                        // Create template directly - the backend will handle default kriteria if needed
                        const currentYear = new Date().getFullYear();
                        const templateResponse = await axios.post(
                            API_ENDPOINTS.postPetaTemplate(currentYear, idInstansi, newIndukUnitKerjaId),
                            {},
                            { headers }
                        );
                        
                        const templateId = templateResponse.data?.id;
                        
                        if (templateId) {
                            console.log("Template created with ID:", templateId);
                            
                            // Setup the matrix with default 5x5
                            await axios.post(
                                `${API_ENDPOINTS.getPetaTemplateById(templateId)}/setup-matrix?tahun=${currentYear}&id_instansi=${idInstansi}&id_induk_unit_kerja=${newIndukUnitKerjaId}&dampak=5&frekuensi=5`,
                                {},
                                { headers }
                            );
                            
                            // Sync the criteria from the template
                            await axios.post(
                                API_ENDPOINTS.syncKriteriaRisikoFromTemplate(idInstansi, newIndukUnitKerjaId, templateId),
                                {},
                                { headers }
                            );
                            console.log("Template created and criteria synced successfully");
                        }
                    } catch (templateError) {
                        console.error("Error creating template:", templateError);
                    }
                } else {
                    console.warn("No induk unit kerja ID found in response");
                }
            }

            showToast("success", "Struktur Organisasi berhasil ditambahkan!");
            navigate('/parameters/struktur-organisasi');
            window.location.reload();
            resetKey(prev => prev + 1);
        } catch (error) {
            const detail = error.response?.data?.detail;
            let errorMsg = "Terjadi kesalahan. Silakan coba lagi.";
            if (Array.isArray(detail)) {
                errorMsg = detail.map(d => d.msg).join(', ');
            } else if (typeof detail === 'string') {
                errorMsg = detail;
            }
            showToast("error", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/parameters/struktur-organisasi');
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <div className="card shadow-sm border-0 mb-3">
            <CardHeader
                title={title}
                isRemoved={isRemoved}
                onRefresh={handleRefresh}
                onExpand={handleExpand}
                onRemove={handleDelete}
            />
            <ContentLoaderWrapper loading={loading} error={errorMessage}>
                <form onSubmit={handleSubmit}>
                    <div className="card-body">
                        <FormUnitKerja
                            selectedIndukUnitKerja={selectedIndukUnitKerja}
                            setSelectedIndukUnitKerja={setSelectedIndukUnitKerja}
                            indukUnitKerja={dataIndukUnitKerja}
                            formData={formData}
                            handleUnitKerjaChange={handleUnitKerjaChange}
                            provinsiData={provinsiOptions}
                            filteredKota={filteredKota}
                            selectedProvinsi={selectedProvinsi}
                            setSelectedProvinsi={setSelectedProvinsi}
                            selectedKota={selectedKota}
                            setSelectedKota={setSelectedKota}
                            handleJabatanChange={handleJabatanChange}
                        />

                        {/* Add FormJenisKonteks component */}
                        <div className="mt-4">
                            <FormJenisKonteks
                                sasaranData={sasaranData}
                                probisData={probisData}
                                onSasaranChange={handleSasaranChange}
                                onProbisChange={handleProbisChange}
                            />
                        </div>
                    </div>
                    <div className="card-footer border-top d-flex justify-content-end p-3">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                        <button className="btn btn-primary" type="submit">
                            <FiSave size={16} className="me-1" /> Simpan
                        </button>
                    </div>
                </form>
            </ContentLoaderWrapper>
        </div>
    );
};

StrukturOrganisasiTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired
};

export default StrukturOrganisasiTambahContent;
