import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiLoader, FiEdit3, FiSave, FiArrowLeft, FiCheckSquare } from 'react-icons/fi';
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
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';

const apiBaseUrl = "http://localhost:8000";
const idInstansi = "67baf4c72465ae8b7645ea5a";
const idIndukUnitKerja = "67bafa17b885deaafaac2656"
const idIdentifikasiRisiko = "67bb3e92682f1bd81f1e2430"
const tahunRisiko = 2025
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

const EvaluasiRisikoTambahContent = ({ title = "Tambah Evaluasi Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();

    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);

    const [dataIdentifikasiRisiko, setDataIdentifikasiRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState([]);
    const [dataAnalisisRisiko, setDataAnalisisRisiko] = useState([]);
    const [selectedIdAnalisisRisiko, setIdSelectedAnalisisRisiko] = useState([]);
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
    const {
        setGeneratedRootCauses,
        generatedRootCauses,
        setLoadingGenerate,
        loadingGenerate,
        selectedRootCause,
        setSelectedRootCause
    } = useOutletContext();


    const [dataKriteriaKemungkinan, SetDataKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaKemungkinan, setSelectedKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaSkorKemungkinan, setSelectedKriteriaSkorKemungkinan] = useState(null);
    const [selectedKriteriaSkorKemungkinanResidual, setSelectedKriteriaSkorKemungkinanResidual] = useState(null);
    const [selectedKriteriaSkorKemungkinanTreated, setSelectedKriteriaSkorKemungkinanTreated] = useState(null);
    const [dataKriteriaDampak, SetDataKriteriaDampak] = useState([]);


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const identifikasiRisikoResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoAll(idInstansi, tahunId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataIdentifikasiRisiko(identifikasiRisikoResponse.data);

                const jenisPenyebabResponse = await axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), {
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
    }, []);

    useEffect(() => {
        const fetchAnalisisRisiko = async () => {
            try {
                if (selectedIdentifikasiRisiko) {
                    const analisisRisikoResponse = await axios.get(API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(selectedIdentifikasiRisiko.value), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                    );
                    setDataAnalisisRisiko(analisisRisikoResponse.data);
                    setIdSelectedAnalisisRisiko(analisisRisikoResponse.data.id);
                } else {
                    setDataAnalisisRisiko([]);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        setSelectedAnalisisRisiko(null);
        fetchAnalisisRisiko();
    }, []);


    useEffect(() => {
        const fetchAnalisisRisiko = async () => {
            try {
                await axios.get(API_ENDPOINTS.getKriteriaRisikoKemungkinanByIndukUnitKerja(idInstansi,)
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

    const handleGenerateRootCauses = async () => {
        const requestBody = {
            "identifikasi_risiko_id": selectedIdentifikasiRisiko.value,
        };
        setLoadingGenerate(true);

        try {
            const response = await axios.post(`${apiBaseUrl}/api/v1/evaluasi-risiko/generate-root-causes`, requestBody, {
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

    console.log(`ROOT CAUSE in Parent: ${JSON.stringify(selectedRootCause)}`);
    if (isRemoved) return null;

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
                                            <SelectDropdownCustom
                                                className="rounded-3"
                                                options={dataIdentifikasiRisiko.map((item) => ({
                                                    label: item.pernyataan_risiko,
                                                    value: String(item.id),
                                                }))}
                                                selectedOption={selectedIdentifikasiRisiko}
                                                onSelectOption={(option) => setSelectedIdentifikasiRisiko(option)}
                                                defaultSelect={String(selectedIdentifikasiRisiko)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="mb-4">
                                            <label className="form-label">Jenis Penyebab <span className="text-danger">*</span></label>
                                            <SelectDropdownCustom
                                                className="rounded-3"
                                                options={dataJenisPenyebab.map((item) => ({
                                                    label: item.nama,
                                                    value: String(item.id),
                                                }))}
                                                selectedOption={selectedJenisPenyebab}
                                                onSelectOption={(option) => setSelectedJenisPenyebab(option)}
                                                defaultSelect={String(selectedJenisPenyebab)}
                                            />
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

                                <div className="col-lg-12 mt-3">
                                    <div className="card border">
                                        <div className="card-header bg-light">
                                            <h6 className="fw-bold mb-0">Akar Penyebab</h6>
                                            {selectedRootCause && (
                                                <span className="badge bg-primary ms-2">Akar Penyebab Dipilih</span>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            <FormAkarPenyebab selectedRootCause={selectedRootCause} />
                                        </div>
                                    </div>
                                </div>


                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengelolaan-risiko/registrasi-risiko`)}>
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

export default EvaluasiRisikoTambahContent;
