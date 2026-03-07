import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiLoader, FiEdit3, FiSave, FiArrowLeft } from 'react-icons/fi';
import { PropagateLoader } from 'react-spinners';
import Dropdown from '@/components/shared/Dropdown';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdown from '@/components/shared/SelectDropdown';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import SelectDropdownSkorKemungkinan from '@/components/shared/SelectDropdownSkorKemungkinan';
import SelectDropdownSkorDampak from '@/components/shared/SelectDropdownSkorDampak';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

const apiBaseUrl = "http://localhost:8000";
const token = localStorage.getItem('access_token');

const skorKemungkinanOptions = [
    { id: 1, label: "A - Sangat Kecil", persentase: "< 20%", color: "bg-success" },
    { id: 2, label: "B - Kecil", persentase: "> 20% - 40%", color: "bg-light-success" },
    { id: 3, label: "C - Sedang", persentase: "> 40% - 60%", color: "bg-warning" },
    { id: 4, label: "D - Besar", persentase: "> 60% - 80%", color: "bg-light-warning" },
    { id: 5, label: "E - Sangat Besar", persentase: "> 80% - 100%", color: "bg-danger" },
];
const skorDampakOptions = [
    { id: 1, label: "TIDAK SIGNIFIKAN", color: "bg-success" },
    { id: 2, label: "MINOR", color: "bg-light-success" },
    { id: 3, label: "MEDIUM", color: "bg-warning" },
    { id: 4, label: "SIGNIFIKAN", color: "bg-light-warning" },
    { id: 5, label: "SANGAT SIGNIFIKAN", color: "bg-danger" },
];

const RegisterRisikoTambahContent = ({ title = "Tambah Pengelolaan Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    if (isRemoved) return null;

    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja, setIdIndukUnitKerja } = useIndukUnitKerja();

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [isIdentifikasiButtonDisabled, setIsIdentifikasiButtonDisabled] = useState(false);
    const [isPengelolaanButtonDisabled, setIsPengelolaanButtonDisabled] = useState(true);

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);

    const [jenisKonteksSasaran, setJenisKonteksSasaran] = useState([]);
    const [selectedJenisKonteksSasaran, setSelectedJenisKonteksSasaran] = useState(null);

    const [selectedKontekSasaran, setSelectedKontekSasaran] = useState([]);
    const [kontekSasaran, setKontekSasaran] = useState([]);
    const [selectedKontekProbis, setSelectedKontekProbis] = useState([]);
    const [kontekProbis, setKontekProbis] = useState([]);
    const [selectedIndikator, setSelectedIndikator] = useState([]);
    const [indikator, setIndikator] = useState([]);
    const [namaJenisKonteks, setNamaJenisKonteks] = useState('');
    const [selectedKamus, setSelectedKamus] = useState([]);
    const [kamus, setKamus] = useState([]);
    const [selectedKategoriRisiko, setSelectedKategoriRisiko] = useState([]);
    const [kategoriRisiko, setKategoriRisiko] = useState([]);
    const { setGeneratedStatements, generatedStatements, setLoadingGenerate, loadingGenerate } = useOutletContext();


    const [dataKriteriaKemungkinan, SetDataKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaKemungkinan, setSelectedKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaSkorKemungkinan, setSelectedKriteriaSkorKemungkinan] = useState(null);
    const [selectedKriteriaSkorKemungkinanResidual, setSelectedKriteriaSkorKemungkinanResidual] = useState(null);
    const [selectedKriteriaSkorKemungkinanTreated, setSelectedKriteriaSkorKemungkinanTreated] = useState(null);
    const [dataKriteriaDampak, SetDataKriteriaDampak] = useState([]);
    const [selectedKriteriaDampak, setSelectedKriteriaDampak] = useState(null);
    const [selectedKriteriaSkorDampak, setSelectedKriteriaSkorDampak] = useState(null);
    const [selectedKriteriaSkorDampakResidual, setSelectedKriteriaSkorDampakResidual] = useState(null);
    const [selectedKriteriaSkorDampakTreated, setSelectedKriteriaSkorDampakTreated] = useState(null);
    const [level, setLevel] = useState(null);
    const [levelResidual, setLevelResidual] = useState(null);
    const [levelTreated, setLevelTreated] = useState(null);
    const [status, setStatus] = useState(null);

    const [formDataIdentifikasiRisiko, setFormDataIdentifikasiRisiko] = useState({
        tahun: new Date().getFullYear(),
        id_jenis_konteks_sasaran: "",
        id_konteks_sasaran: "",
        id_konteks_probis: "",
        id_indikator: "",
        id_bagan_risiko: "",
        id_kategori_risiko: "",
        id_metode_spip: "",
        pernyataan_risiko: "",
        deskripsi: "",
        disabled: false,
        disabled_reason: "",
        uraian_dampak: "",
        id_instansi: idInstansi,
        id_induk_unit_kerja: idIndukUnitKerja,
        generation_id: "",
        statement_id: ""
    });

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const jenisKonteksSasaranResponse = await axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const filteredJenisKonteksSasaran = jenisKonteksSasaranResponse.data.flatMap((item) =>
                    item.jenis_konteks.filter((konteks) => konteks.jenis === "SASARAN")
                );
                setJenisKonteksSasaran(filteredJenisKonteksSasaran)

                const konteksSasaranResponse = await axios.get(`${apiBaseUrl}/api/v1/konteks?id_instansi=${idInstansi}&jenis=SASARAN`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKontekSasaran(konteksSasaranResponse.data);

                const konteksProbisResponse = await axios.get(`${apiBaseUrl}/api/v1/konteks?id_instansi=${idInstansi}&jenis=PROBIS`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKontekProbis(konteksProbisResponse.data)

                const kamusResponse = await axios.get(`${apiBaseUrl}/api/v1/kamus-risiko?id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKamus(kamusResponse.data)

                const kategoriRisikoResponse = await axios.get(`${apiBaseUrl}/api/v1/kategori-risiko?id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKategoriRisiko(kategoriRisikoResponse.data)

            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    useEffect(() => {
        const fetchIndikator = async () => {
            try {
                if (selectedKontekSasaran) {
                    const response = await axios.get(
                        `${apiBaseUrl}/api/v1/indikator?id_konteks=${selectedKontekSasaran.value}&id_instansi=${idInstansi}`,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    setIndikator(response.data);
                } else {
                    setIndikator([]);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        setSelectedIndikator(null);
        fetchIndikator();
    }, [selectedKontekSasaran]);

    useEffect(() => {
        const fetchAnalisisRisiko = async () => {
            try {

                const kriteriaKemungkinanResponse = await axios.get(`${apiBaseUrl}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                SetDataKriteriaKemungkinan(kriteriaKemungkinanResponse.data)

                const kriteriaDampakResponse = await axios.get(`${apiBaseUrl}/api/v1/kriteria-risiko/dampak?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                SetDataKriteriaDampak(kriteriaDampakResponse.data)

            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalisisRisiko();
    }, []);

    const handleGenerateStatements = async () => {
        const requestBody = {
            "id_konteks_sasaran": "67baff78c045a7066b2a0a4c",
            "id_indikator": "67baffdec045a7066b2a0a4f",
            "id_konteks_probis": "67baff82c045a7066b2a0a4d",
            "count": 5
        };

        setLoadingGenerate(true);

        try {
            const response = await axios.post(`${apiBaseUrl}/api/v1/identifikasi-risiko/generate-statements`, requestBody, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const statements = response.data.statements.map((statement) => ({
                ...statement,
                tag: "Generate by AI", // Initialize an empty tag for each statement
            }));

            setGeneratedStatements(statements); // Set the generated statements to state
        } catch (error) {
            console.error("Error generating statements:", error);
        } finally {
            setLoadingGenerate(false);
        }
    };

    const handleJenisKonteksSasaranChange = (selectedOption) => {
        setSelectedJenisKonteksSasaran(selectedOption);
        setIdIndukUnitKerja(selectedOption.id_induk_unit_kerja);
    };

    const handleInputTextIdentifikasiRisiko = (e) => {
        const { name, value } = e.target;
        setFormDataIdentifikasiRisiko((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleIdentifikasiSubmit = async (e) => {
        e.preventDefault();
        setIsIdentifikasiButtonDisabled(true);
        setLoading(true);
        setErrorMessage("");

        const submissionDataIdentifikasiRisiko = {
            ...formDataIdentifikasiRisiko,
            id_jenis_konteks_sasaran: selectedJenisKonteksSasaran?.value || '',
            id_konteks_sasaran: selectedKontekSasaran?.value || '',
            id_konteks_probis: selectedKontekProbis?.value || '',
            id_indikator: selectedIndikator?.value || '',
            id_kategori_risiko: selectedKategoriRisiko?.value || '',
            pernyataan_risiko: selectedKamus?.label || ''
        };

        try {
            const token = localStorage.getItem("access_token");
            // POST Identifikasi Risiko endpoint
            await axios.post(API_ENDPOINTS.postIdentifikasiRisiko, submissionDataIdentifikasiRisiko, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Identifikasi Risiko Berhasil Ditambahkan!");
            setIsPengelolaanButtonDisabled(false);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handlePengelolaanSubmit = async (e) => {
        e.preventDefault();
        setIsPengelolaanButtonDisabled(true);
        setLoading(true);
        setErrorMessage("");
        console.log(formDataIdentifikasiRisiko.id)

        const submissionDataPengelolaanRisiko = {
            id_instansi: idInstansi,
            id_induk_unit_kerja: idIndukUnitKerja,
            tahun: formDataIdentifikasiRisiko.tahun,
            identifikasi_risiko_id: formDataIdentifikasiRisiko.id,
            kemungkinan_id_inherit: selectedKriteriaKemungkinan?.value || '',
            dampak_id_inherit: selectedKriteriaDampak?.value || '',
            kemungkinan_id_residual: selectedKriteriaSkorKemungkinanResidual?.value || '',
            dampak_id_residual: selectedKriteriaSkorDampakResidual?.value || '',
            skor_kemungkinan_inherit: selectedKriteriaSkorKemungkinan?.value || 0,
            skor_dampak_inherit: selectedKriteriaSkorDampak?.value || 0,
            skor_kemungkinan_residual: selectedKriteriaSkorKemungkinanResidual?.value || 0,
            skor_dampak_residual: selectedKriteriaSkorDampakResidual?.value || 0,
            use_risk: "", // Set the appropriate value here
            level_risiko_inherit: level || 0,
            level_risiko_residual: levelResidual || 0,
            is_akhir_tahun: false, // Adjust based on your needs
            kemungkinan_id_treated: selectedKriteriaSkorKemungkinanTreated?.value || '',
            skor_kemungkinan_treated: selectedKriteriaSkorKemungkinanTreated?.value || 0,
            skor_dampak_treated: selectedKriteriaSkorDampakTreated?.value || 0,
            level_risiko_treated: levelTreated || 0,
        };

        try {
            const token = localStorage.getItem("access_token");
            // POST Pengelolaan Risiko endpoint
            await axios.post(API_ENDPOINTS.postAnalisisRisiko, submissionDataPengelolaanRisiko, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Pengelolaan Risiko Berhasil Ditambahkan!");
            // Reset form data after successful submission
            setFormDataIdentifikasiRisiko({});
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    {loading ? (
                        <p className="text-center">Loading...</p>
                    ) : errorMessage ? (
                        <p className="text-danger text-center">{errorMessage}</p>
                    ) : dataPernyataanRisiko ? (
                        <div className="d-flex justify-content-center align-items-center">
                            <div className="col-xl-12">
                                <div className="col-lg-12 mt-3">
                                    <div className="card border">
                                        <div className="card-header bg-light">
                                            <h5 className="fw-bold mt-2 mb-2">Identifikasi Risiko</h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Sasaran</label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={jenisKonteksSasaran.map((item) => ({
                                                                label: item.nama,
                                                                value: item.id,
                                                                id_induk_unit_kerja: item.id_induk_unit_kerja
                                                            }))}
                                                            selectedOption={selectedJenisKonteksSasaran}
                                                            onSelectOption={handleJenisKonteksSasaranChange}
                                                            defaultSelect=""
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Konteks Sasaran <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={kontekSasaran.map((item) => ({
                                                                label: item.nama,
                                                                value: item.id,
                                                            }))}
                                                            selectedOption={selectedKontekSasaran}
                                                            onSelectOption={setSelectedKontekSasaran}
                                                            defaultSelect=""
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Indikator <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={indikator.map((item) => ({
                                                                label: item.nama,
                                                                value: item.id,
                                                            }))}
                                                            selectedOption={selectedIndikator}
                                                            onSelectOption={setSelectedIndikator}
                                                            defaultSelect=""
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Konteks Probis <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={kontekProbis.map((item) => ({
                                                                label: item.nama,
                                                                value: item.id,
                                                            }))}
                                                            selectedOption={selectedKontekProbis}
                                                            onSelectOption={setSelectedKontekProbis}
                                                            defaultSelect=""
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-8">
                                                        <div className="mb-4">
                                                            <label className="form-label">Pernyataan Risiko <span className="text-danger">*</span></label>
                                                            <SelectDropdown
                                                                className="rounded-3"
                                                                options={kamus.map((item) => ({
                                                                    label: item.nama,
                                                                    value: item.id,
                                                                }))}
                                                                selectedOption={selectedKamus}
                                                                onSelectOption={setSelectedKamus}
                                                                defaultSelect=""
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-4 ">
                                                        <div className="mb-4 d-flex justify-content-start align-items-center" style={{ height: '100%' }}>
                                                            <button
                                                                className="btn btn-success d-flex justify-content-between align-items-center"
                                                                type="button"
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#pernyataanRisikoModal"
                                                                onClick={handleGenerateStatements}
                                                            >
                                                                <FiLoader size={16} className="me-2" />
                                                                Generate Pernyataan Risiko by AI
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Kategori Risiko <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={kategoriRisiko.map((item) => ({
                                                                label: item.nama,
                                                                value: item.id,
                                                            }))}
                                                            selectedOption={selectedKategoriRisiko}
                                                            onSelectOption={setSelectedKategoriRisiko}
                                                            defaultSelect=""
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Uraian Dampak</label>
                                                        <textarea
                                                            name="uraian_dampak"
                                                            rows={3}
                                                            className="form-control form-control-sm"
                                                            value={formDataIdentifikasiRisiko.uraian_dampak}
                                                            onChange={handleInputTextIdentifikasiRisiko}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <button
                                                    className="btn btn-lg btn-primary"
                                                    type="submit"
                                                    onClick={handleIdentifikasiSubmit}
                                                // disabled={isIdentifikasiButtonDisabled}
                                                >
                                                    <FiSave size={16} className="me-2" />
                                                    Simpan Identifikasi Risiko
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-12 mt-3">
                                    <div className="card border">
                                        <div className="card-header bg-light">
                                            <h5 className="fw-bold mt-2 mb-2">Analisis Risiko</h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="card-header bg-light mb-2">
                                                    <h6 className="fw-bold mt-2 mb-2">Inherent Risk</h6>
                                                    <span className="badge bg-primary ms-2"> </span>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Kriteria Kemungkinan <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={dataKriteriaKemungkinan.map((item) => ({
                                                                label: item.deskripsi,
                                                                value: String(item.id),
                                                            }))}
                                                            selectedOption={selectedKriteriaKemungkinan}
                                                            onSelectOption={(option) => setSelectedKriteriaKemungkinan(option)}
                                                            defaultSelect={selectedKriteriaKemungkinan}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Probabilitas <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorKemungkinan
                                                            className="rounded-3"
                                                            options={skorKemungkinanOptions.map((item) => ({
                                                                label: item.label,
                                                                value: item.id,
                                                                color: item.color,
                                                                persentase: item.persentase,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorKemungkinan}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorKemungkinan(option)}
                                                            defaultSelect={selectedKriteriaSkorKemungkinan}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Kriteria Dampak <span className="text-danger">*</span></label>
                                                        <SelectDropdown
                                                            className="rounded-3"
                                                            options={dataKriteriaDampak.map((item) => ({
                                                                label: item.deskripsi,
                                                                value: String(item.id),
                                                            }))}
                                                            selectedOption={selectedKriteriaDampak}
                                                            onSelectOption={(option) => setSelectedKriteriaDampak(option)}
                                                            defaultSelect={String(selectedKriteriaDampak)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Dampak <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorDampak
                                                            className="rounded-3"
                                                            options={skorDampakOptions.map((item) => ({
                                                                label: item.label,
                                                                value: item.id,
                                                                color: item.color,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorDampak}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorDampak(option)}
                                                            defaultSelect={selectedKriteriaSkorDampak}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <span className="fw-bold mb-2">Level Risiko</span>
                                                    <div className="col-lg-12 mb-4">
                                                        <span
                                                            className={`badge 
                                                        ${level == null ? 'bg-light-secondary' : level >= 1 && level <= 15 ? 'bg-light-success' : level >= 16 && level <= 20 ? 'bg-light-warning' : 'bg-light-danger'} 
                                                        text-${level == null ? 'secondary' : level >= 1 && level <= 15 ? 'success' : level >= 16 && level <= 20 ? 'warning' : 'danger'} 
                                                        rounded-4 p-2 d-inline-flex justify-content-center align-items-center`}>
                                                            <span className="ms-4 me-4 fs-5 text-center">
                                                                {level == null ? '-' : level}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="card-header bg-light mb-2">
                                                    <h6 className="fw-bold mt-2 mb-2">Residual Risk</h6>
                                                    <span className="badge bg-primary ms-2"> </span>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Probabilitas <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorKemungkinan
                                                            className="rounded-3"
                                                            options={skorKemungkinanOptions.map((item) => ({
                                                                label: item.label,
                                                                value: String(item.id),
                                                                color: item.color,
                                                                persentase: item.persentase,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorKemungkinanResidual}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorKemungkinanResidual(option)}
                                                            defaultSelect={String(selectedKriteriaSkorKemungkinanResidual)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Dampak <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorDampak
                                                            className="rounded-3"
                                                            options={skorDampakOptions.map((item) => ({
                                                                label: item.label,
                                                                value: String(item.id),
                                                                color: item.color,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorDampakResidual}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorDampakResidual(option)}
                                                            defaultSelect={String(selectedKriteriaSkorDampakResidual)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-6 mb-4">
                                                        <div className="fw-bold mb-2">Level Risiko</div>
                                                        <span
                                                            className={`badge 
                                                        ${levelResidual == null ? 'bg-light-secondary' : levelResidual >= 1 && levelResidual <= 15 ? 'bg-light-success' : levelResidual >= 16 && levelResidual <= 20 ? 'bg-light-warning' : 'bg-light-danger'} 
                                                        text-${levelResidual == null ? 'secondary' : levelResidual >= 1 && levelResidual <= 15 ? 'success' : levelResidual >= 16 && levelResidual <= 20 ? 'warning' : 'danger'} 
                                                        rounded-4 p-2 d-inline-flex justify-content-center align-items-center`}>
                                                            <span className="ms-4 me-4 fs-5 text-center">
                                                                {levelResidual == null ? '-' : levelResidual}
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="col-lg-2 mb-4">
                                                        <div className="fw-bold mb-2">Status</div>
                                                        <span
                                                            className={`badge
                                                                ${!status ? 'bg-light-secondary' : status === 'Memadai' ? 'bg-light-success' : 'bg-light-danger'}
                                                                text-${!status ? 'secondary' : status === 'Memadai' ? 'success' : 'danger'}
                                                                rounded-4 p-2 d-inline-flex justify-content-center align-items-center`}
                                                        >
                                                            <span className="ms-4 me-4 fs-5 text-center">
                                                                {!status ? '-' : status}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="card-header bg-light mb-2">
                                                    <h6 className="fw-bold mt-2 mb-2">Treated Risk</h6>
                                                    <span className="badge bg-primary ms-2"> </span>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Probabilitas <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorKemungkinan
                                                            className="rounded-3"
                                                            options={skorKemungkinanOptions.map((item) => ({
                                                                label: item.label,
                                                                value: String(item.id),
                                                                color: item.color,
                                                                persentase: item.persentase,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorKemungkinanTreated}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorKemungkinanTreated(option)}
                                                            defaultSelect={String(selectedKriteriaSkorKemungkinanTreated)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="mb-4">
                                                        <label className="form-label">Skor Dampak <span className="text-danger">*</span></label>
                                                        <SelectDropdownSkorDampak
                                                            className="rounded-3"
                                                            options={skorDampakOptions.map((item) => ({
                                                                label: item.label,
                                                                value: String(item.id),
                                                                color: item.color,
                                                            }))}
                                                            selectedOption={selectedKriteriaSkorDampakTreated}
                                                            onSelectOption={(option) => setSelectedKriteriaSkorDampakTreated(option)}
                                                            defaultSelect={String(selectedKriteriaSkorDampakTreated)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-6 mb-4">
                                                        <div className="fw-bold mb-2">Level Risiko</div>
                                                        <span
                                                            className={`badge 
                                                        ${levelTreated == null ? 'bg-light-secondary' : levelTreated >= 1 && levelTreated <= 15 ? 'bg-light-success' : levelTreated >= 16 && levelTreated <= 20 ? 'bg-light-warning' : 'bg-light-danger'} 
                                                        text-${levelTreated == null ? 'secondary' : levelTreated >= 1 && levelTreated <= 15 ? 'success' : levelTreated >= 16 && levelTreated <= 20 ? 'warning' : 'danger'} 
                                                        rounded-4 p-2 d-inline-flex justify-content-center align-items-center`}>
                                                            <span className="ms-4 me-4 fs-5 text-center">
                                                                {levelTreated == null ? '-' : levelTreated}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengelolaan-risiko/registrasi-risiko`)}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button
                                        className="btn btn-lg btn-primary"
                                        type="submit"
                                        onClick={handlePengelolaanSubmit}
                                    // disabled={isPengelolaanButtonDisabled}
                                    >
                                        <FiSave size={16} className="me-2" />
                                        Simpan Pengelolaan Risiko
                                    </button>
                                </div>

                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-muted">Data tidak ditemukan.</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default RegisterRisikoTambahContent;
