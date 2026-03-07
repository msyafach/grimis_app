import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiLoader, FiEdit3, FiSave, FiArrowLeft, FiCheckSquare, FiTrash, FiExternalLink } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdown from '@/components/shared/SelectDropdown';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import SelectDropdownSkorKemungkinan from '@/components/shared/SelectDropdownSkorKemungkinan';
import SelectDropdownSkorDampak from '@/components/shared/SelectDropdownSkorDampak';
import FormAkarPenyebab from './FormAkarPenyebab';
import FormEvaluasiRisiko from './FormEvaluasiRisiko';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import API_ENDPOINTS from '@/config/apiConfig';



const EvaluasiRisikoEditContent = ({ title = "Edit Evaluasi Risiko" }) => {
    const navigate = useNavigate();
    const { idIdentifikasiRisiko } = useParams();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const token = localStorage.getItem('access_token');

    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    if (isRemoved) return null;

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);

    const [dataIdentifikasiRisiko, setDataIdentifikasiRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState([]);
    const [selectedIdIdentifikasiRisiko, setSelectedIdIdentifikasiRisiko] = useState([]);
    const [dataAnalisisRisiko, setDataAnalisisRisiko] = useState([]);
    const [selectedIdAnalisisRisiko, setSelectedIdAnalisisRisiko] = useState([]);
    const [selectedAnalisisRisiko, setSelectedAnalisisRisiko] = useState([]);
    const [dataJenisPenyebab, setDataJenisPenyebab] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState([]);

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
    // const {
    //     setGeneratedRootCauses,
    //     generatedRootCauses,
    //     setLoadingGenerate,
    //     loadingGenerate,
    //     selectedRootCause,
    //     setSelectedRootCause
    // } = useOutletContext();
    const {
        generatedRootCauses,
        setGeneratedRootCauses,
        loadingGenerate,
        setLoadingGenerate,
        selectedRootCauses,
        setSelectedRootCauses,
        savedRootCauseIds,
        setSavedRootCauseIds,
    } = useOutletContext();

    useEffect(() => {
        const fetchAllData = async () => {
            if (!idInstansi || !tahunId || !idIdentifikasiRisiko) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                const identifikasiRisikoResponse = await axios.get(
                    `${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/identifikasi-risiko/${idIdentifikasiRisiko}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                setDataIdentifikasiRisiko(identifikasiRisikoResponse.data);
                setSelectedIdIdentifikasiRisiko(identifikasiRisikoResponse.data.id);

                const analisisRisikoResponse = await axios.get(
                    `${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko?tahun=${tahunId}&identifikasi_risiko_id=${idIdentifikasiRisiko}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                const result = analisisRisikoResponse.data;

                if (Array.isArray(result) && result.length > 0) {
                    setDataAnalisisRisiko(result);
                    setSelectedIdAnalisisRisiko(result[0].id); // 👈 ambil ID dari item pertama
                } else {
                    setDataAnalisisRisiko([]);
                    setSelectedIdAnalisisRisiko(null);
                }

                const jenisPenyebabResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/jenis-penyebab?id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataJenisPenyebab(jenisPenyebabResponse.data);

            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [idIdentifikasiRisiko, idInstansi, tahunId, idIndukUnitKerja]);

    const handleGenerateRootCauses = async () => {
        const requestBody = {
            "identifikasi_risiko_id": dataIdentifikasiRisiko.id,
        };
        setLoadingGenerate(true);

        try {
            const response = await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/evaluasi-risiko/generate-root-causes`, requestBody, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const rootCauses = response.data;
            setGeneratedRootCauses(rootCauses);
        } catch (error) {
            console.error("Error generating root causes:", error);
        } finally {
            setLoadingGenerate(false);
        }
    };

    useEffect(() => {
        const handleAddRootCause = async (e) => {
            const root = e.detail;
            const payload = {
                identifikasi_risiko_id: selectedIdIdentifikasiRisiko,
                analisis_risiko_id: selectedIdAnalisisRisiko,
                jenis_penyebab_id: null,
                deskripsi: root.deskripsi,
                jenis: root.jenis || "penyebab",
                pengendalian: root.pengendalian || "",
                jenis_pengendalian: root.jenis_pengendalian || "",
            };

            try {
                await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/evaluasi-risiko`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log("✅ Root cause dari AI berhasil disimpan!");
                // Opsional: bisa tambahkan notifikasi atau toast
                setTimeout(() => {
                    // Trigger refresh data FormEvaluasiRisiko (otomatis jika pakai useEffect dependency)
                    window.dispatchEvent(new Event("refresh-evaluasi-risiko"));
                }, 300);
            } catch (err) {
                console.error("❌ Gagal menyimpan root cause dari AI:", err);
            }
        };

        const handleSaveRootCauses = async (causes) => {
            const newSaved = [];

            for (const cause of causes) {
                try {
                    const payload = {
                        identifikasi_risiko_id: selectedIdIdentifikasiRisiko,
                        analisis_risiko_id: selectedIdAnalisisRisiko,
                        deskripsi: cause.deskripsi,
                        jenis: cause.jenis || "penyebab",
                        jenis_penyebab_id: cause.jenis_penyebab_id || "",
                        pengendalian: cause.pengendalian || "",
                        jenis_pengendalian: cause.jenis_pengendalian || "",
                    };

                    await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/evaluasi-risiko`, payload, {
                        headers: { Authorization: `Bearer ${token}` },
                    });

                    newSaved.push(cause.id);
                } catch (err) {
                    console.error("❌ Gagal menyimpan root cause:", err);
                }
            }

            setSavedRootCauseIds((prev) => [...prev, ...newSaved]);
            setSelectedRootCauses([]);
        };

        window.addEventListener("add-root-cause", handleAddRootCause);
        return () => {
            window.removeEventListener("add-root-cause", handleAddRootCause);
        };
    }, [selectedIdIdentifikasiRisiko, selectedIdAnalisisRisiko]);



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
                                <div className="row">
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <label className="form-label">Pernyataan Risiko <span className="text-danger">*</span></label>
                                            <input type="text" className="form-control form-control-sm rounded-4" value={dataIdentifikasiRisiko.pernyataan_risiko} disabled={true} />
                                        </div>
                                    </div>

                                    <div className="col-lg-12 mb-4">
                                        <div className="gap-2 d-flex justify-content-start align-items-center" style={{ height: '100%' }}>
                                            <button
                                                className="btn btn-success d-flex justify-content-between align-items-center"
                                                type="button"
                                                data-bs-toggle="modal"
                                                data-bs-target="#evaluasiRisikoModal"
                                                onClick={handleGenerateRootCauses}
                                            >
                                                <FiLoader size={16} className="me-2" />
                                                Generate Akar Penyebab by AI
                                            </button>
                                            <button
                                                className="btn btn-primary d-flex justify-content-between align-items-center"
                                                type="button"
                                                data-bs-toggle="modal"
                                                data-bs-target="#evaluasiRisikoModal"
                                            >
                                                <FiCheckSquare size={16} className="me-2" />
                                                Pilih Akar Penyebab by AI
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <FormEvaluasiRisiko
                                    identifikasiRisikoId={selectedIdIdentifikasiRisiko}
                                    analisisRisikoId={selectedIdAnalisisRisiko}
                                />

                                <div className="d-flex justify-content-end gap-2 mt-4 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengendalian-risiko/evaluasi-risiko`)}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button className="btn btn-lg btn-primary" type="submit">
                                        <FiSave size={16} className="me-2" />Simpan
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

export default EvaluasiRisikoEditContent;
