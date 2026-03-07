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


const RegisterRisikoTambahContent = ({ title = "Tambah Pengelolaan Risiko", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    if (isRemoved) return null;

    const token = localStorage.getItem('access_token');
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja, setIdIndukUnitKerja } = useIndukUnitKerja();

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

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

                const konteksSasaranResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/konteks?id_instansi=${idInstansi}&jenis=SASARAN`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKontekSasaran(konteksSasaranResponse.data);

                const konteksProbisResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/konteks?id_instansi=${idInstansi}&jenis=PROBIS`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKontekProbis(konteksProbisResponse.data)

                const kamusResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/kamus-risiko?id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                setKamus(kamusResponse.data)

                const kategoriRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/kategori-risiko?id_instansi=${idInstansi}`, {
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
                        `${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/indikator?id_konteks=${selectedKontekSasaran.value}&id_instansi=${idInstansi}`,
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

    const handleGenerateStatements = async () => {
        const requestBody = {
            "id_konteks_sasaran": selectedKontekSasaran.value,
            "id_indikator": selectedIndikator.value,
            "id_konteks_probis": selectedKontekProbis.value,
            "count": 5
        };
        setLoadingGenerate(true);
        try {
            const response = await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/identifikasi-risiko/generate-statements`, requestBody, {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('statements:', response.data.statements);

            const statements = response.data.statements.map((statement) => ({
                id: statement.id,
                pernyataan: statement.pernyataan || "",
                deskripsi: statement.deskripsi || "",
                generation_id: response.data.generation_id,
                tag: statement.tag || "NORMAL"
            }));

            setGeneratedStatements(statements);
        } catch (error) {
            console.error("Error generating statements:", error);
        } finally {
            setLoadingGenerate(false);
        }
    };

    const handleJenisKonteksSasaranChange = (selectedOption) => {
        setSelectedJenisKonteksSasaran(selectedOption);
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
            resetKey((prevKey) => prevKey + 1);
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
                                <h5 className="fw-bold mt-2 mb-2">Identifikasi Risiko</h5>
                                <div className="row">
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <label className="form-label">Sasaran</label>
                                            <SelectDropdown
                                                className="rounded-3"
                                                options={jenisKonteksSasaran.map((item) => ({
                                                    label: item.nama,
                                                    value: item.id,
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

                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengelolaan-risiko/registrasi-risiko`)}>
                                        <FiArrowLeft size={16} className="me-2" />
                                        Kembali
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        type="submit"
                                        onClick={handleIdentifikasiSubmit}
                                    >
                                        <FiSave size={16} className="me-2" />
                                        Simpan Identifikasi Risiko
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
