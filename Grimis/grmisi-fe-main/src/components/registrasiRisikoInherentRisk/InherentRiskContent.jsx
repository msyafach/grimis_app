import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiEdit3, FiEye, FiMoreHorizontal, FiTrash2, FiPlus } from 'react-icons/fi';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdown from '@/components/shared/SelectDropdown';
import SelectDropdownSkorKemungkinan from '@/components/shared/SelectDropdownSkorKemungkinan';
import SelectDropdownSkorDampak from '@/components/shared/SelectDropdownSkorDampak';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import { useParams } from 'react-router-dom';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import API_ENDPOINTS from '@/config/apiConfig';

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


const InherentRiskContent = ({ title = "Skor / Nilai Inherent Risk" }) => {
    const navigate = useNavigate();

    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    if (isRemoved) return null;

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState([]);

    const [selectedIndikator, setSelectedIndikator] = useState([]);
    const [indikator, setIndikator] = useState([]);

    const { idIdentifikasiRisiko } = useParams();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [idAnalisisRisiko, setIdAnalisisRisiko] = useState(null);

    const [kemungkinanIdInherit, setKemungkinanIdInherit] = useState("");
    const [dampakIdInherit, setDampakIdInherit] = useState("");
    const [dataKriteriaKemungkinan, SetDataKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaKemungkinan, setSelectedKriteriaKemungkinan] = useState(null);
    const [selectedKriteriaSkorKemungkinan, setSelectedKriteriaSkorKemungkinan] = useState(null);

    const [dataKriteriaDampak, SetDataKriteriaDampak] = useState([]);
    const [selectedKriteriaDampak, setSelectedKriteriaDampak] = useState(null);
    const [selectedKriteriaSkorDampak, setSelectedKriteriaSkorDampak] = useState(null);

    const [level, setLevel] = useState(0);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!idInstansi || !tahunId || !idIdentifikasiRisiko) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch Identifikasi Risiko
                const identifikasiRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/identifikasi-risiko/${idIdentifikasiRisiko}`, { headers });
                setSelectedIdentifikasiRisiko(identifikasiRisikoResponse.data);

                // Fetch Analisis Risiko by Identifikasi ID
                let currAnalisisId = null;
                let currentKemungkinanId = "";
                let currentDampakId = "";
                const analisisRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko/by-identifikasi/${idIdentifikasiRisiko}`, { headers });
                if (analisisRisikoResponse.data && analisisRisikoResponse.data.length > 0) {
                    const analisisData = analisisRisikoResponse.data[0];
                    currAnalisisId = analisisData.id;
                    setIdAnalisisRisiko(currAnalisisId);
                    setLevel(analisisData.level_risiko_inherit);
                    setSelectedKriteriaSkorKemungkinan(analisisData.skor_kemungkinan_inherit);
                    setSelectedKriteriaSkorDampak(analisisData.skor_dampak_inherit);

                    currentKemungkinanId = analisisData.kemungkinan_id_inherit || "";
                    currentDampakId = analisisData.dampak_id_inherit || "";
                    setKemungkinanIdInherit(currentKemungkinanId);
                    setDampakIdInherit(currentDampakId);
                }

                // Fetch Kriteria Kemungkinan
                const kriteriaKemungkinanResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, { headers });
                SetDataKriteriaKemungkinan(kriteriaKemungkinanResponse.data);
                if (currentKemungkinanId) {
                    const selectedKemungkinan = kriteriaKemungkinanResponse.data.find(item => item.id === currentKemungkinanId);
                    if (selectedKemungkinan) {
                        setSelectedKriteriaKemungkinan({ label: selectedKemungkinan.deskripsi, value: selectedKemungkinan.id });
                    }
                }

                // Fetch Kriteria Dampak
                const kriteriaDampakResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/kriteria-risiko/dampak?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, { headers });
                SetDataKriteriaDampak(kriteriaDampakResponse.data);
                if (currentDampakId) {
                    const selectedDampak = kriteriaDampakResponse.data.find(item => item.id === currentDampakId);
                    if (selectedDampak) {
                        setSelectedKriteriaDampak({ label: selectedDampak.deskripsi, value: selectedDampak.id });
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
    }, [idIdentifikasiRisiko, idInstansi, tahunId, idIndukUnitKerja]);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!selectedKriteriaSkorKemungkinan || !selectedKriteriaSkorDampak || !selectedKriteriaKemungkinan?.value || !selectedKriteriaDampak?.value) {
            Swal.fire({
                icon: "error",
                title: "Peringatan",
                text: "Mohon lengkapi seluruh isian skor kemungkinan dan dampak",
            });
            return;
        }

        const payload = {
            tahun: Number(tahunId),
            identifikasi_risiko_id: idIdentifikasiRisiko,
            id_induk_unit_kerja: idIndukUnitKerja,
            kemungkinan_id_inherit: selectedKriteriaKemungkinan.value,
            dampak_id_inherit: selectedKriteriaDampak.value,
            skor_kemungkinan_inherit: Number(selectedKriteriaSkorKemungkinan),
            skor_dampak_inherit: Number(selectedKriteriaSkorDampak),
        };

        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };
            let updatedAnalisis = null;

            if (idAnalisisRisiko) {
                const res = await axios.put(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko/${idAnalisisRisiko}`, payload, { headers });
                updatedAnalisis = res.data;
            } else {
                const res = await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko`, payload, { headers });
                setIdAnalisisRisiko(res.data.id);
                updatedAnalisis = res.data;
            }

            if (updatedAnalisis) {
                setLevel(updatedAnalisis.level_risiko_inherit || 0);
            }

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Data Inherent Risk berhasil disimpan',
            });
        } catch (error) {
            console.error("Save Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Terjadi kesalahan saat menyimpan data.',
            });
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
                                <div className="row">
                                    <div className="col-lg-12">
                                        <h5 className="fw-bold">{selectedIdentifikasiRisiko?.pernyataan_risiko}</h5>
                                        <p>{selectedIdentifikasiRisiko?.deskripsi}</p>
                                    </div>
                                </div>
                                <div className="col-lg-12">
                                    <div className="mb-4">
                                        <label className="form-label">Kriteria Kemungkinan <span className="text-danger">*</span></label>
                                        <SelectDropdownCustom
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
                                        <SelectDropdownCustom
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
                                    <div className="col-lg-12">
                                        <h5 className="fw-bold">Level Risiko</h5>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-1">
                                        <span
                                            className={`badge ${level >= 1 && level <= 15 ? 'bg-light-success' : level >= 16 && level <= 20 ? 'bg-light-warning' : 'bg-light-danger'} 
                                                        text-${level >= 1 && level <= 15 ? 'success' : level >= 16 && level <= 20 ? 'warning' : 'danger'} 
                                                        rounded-4 p-2 d-inline-flex justify-content-center align-items-center`}>
                                            <span className="ms-4 me-4 fs-5 text-center">{level}</span>
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengelolaan-risiko/registrasi-risiko/${idIdentifikasiRisiko}`)}>
                                        <FiArrowLeft size={16} className="me-2" />Kembali
                                    </button>
                                    <button className="btn btn-lg btn-primary" type="button" onClick={handleSave}>
                                        <FiSave size={16} className="me-2" />Simpan Perubahan
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

export default InherentRiskContent;
