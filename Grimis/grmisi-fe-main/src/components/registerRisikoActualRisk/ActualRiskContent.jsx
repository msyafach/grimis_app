import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiEdit3, FiEye, FiMoreHorizontal, FiTrash2, FiPlus } from 'react-icons/fi';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdownSkorKemungkinan from '@/components/shared/SelectDropdownSkorKemungkinan';
import SelectDropdownSkorDampak from '@/components/shared/SelectDropdownSkorDampak';
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


const ActualRiskContent = ({ title = "Skor / Nilai Actual Risk" }) => {
    const navigate = useNavigate();

    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    if (isRemoved) return null;

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);

    const { idIdentifikasiRisiko } = useParams();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja } = useIndukUnitKerja();

    const [selectedIdIdentifikasiRisiko, setSelectedIdIdentifikasiRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState([]);
    const [selectedIdAnalisisRisiko, setselectedIdAnalisisRisiko] = useState(null);
    const [selectedAnalisisRisiko, setSelectedAnalisisRisiko] = useState([]);


    const [selectedIndikator, setSelectedIndikator] = useState([]);
    const [indikator, setIndikator] = useState([]);

    const [kemungkinanIdInherit, setKemungkinanIdInherit] = useState("67bb3787e0eca810c8ccde66");
    const [dampakIdInherit, setDampakIdInherit] = useState("67bb37f0e0eca810c8ccde6a");

    const [selectedKriteriaSkorKemungkinan, setSelectedKriteriaSkorKemungkinan] = useState(null);
    const [selectedKriteriaSkorDampak, setSelectedKriteriaSkorDampak] = useState(null);

    const [level, setLevel] = useState(1);

    useEffect(() => {
        const fetchAllData = async () => {
            if (!idInstansi || !tahunId || !idIdentifikasiRisiko) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };

                const identifikasiRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/identifikasi-risiko/${idIdentifikasiRisiko}`, { headers });
                setSelectedIdentifikasiRisiko(identifikasiRisikoResponse.data);

                const analisisRisikoResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko/by-identifikasi/${idIdentifikasiRisiko}`, { headers });
                if (analisisRisikoResponse.data && analisisRisikoResponse.data.length > 0) {
                    const analisisData = analisisRisikoResponse.data[0];
                    setselectedIdAnalisisRisiko(analisisData.id);
                    setSelectedAnalisisRisiko(analisisData);
                    setLevel(analisisData.level_risiko_actual || 0);
                    setSelectedKriteriaSkorKemungkinan(analisisData.skor_kemungkinan_actual);
                    setSelectedKriteriaSkorDampak(analisisData.skor_dampak_actual);
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

        if (!selectedKriteriaSkorKemungkinan || !selectedKriteriaSkorDampak) {
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
            skor_kemungkinan_actual: Number(selectedKriteriaSkorKemungkinan),
            skor_dampak_actual: Number(selectedKriteriaSkorDampak),
        };

        try {
            const token = localStorage.getItem('access_token');
            const headers = { Authorization: `Bearer ${token}` };

            if (selectedIdAnalisisRisiko) {
                const res = await axios.put(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko/${selectedIdAnalisisRisiko}`, payload, { headers });
                setLevel(res.data.level_risiko_actual || 0);
            } else {
                const res = await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/analisis-risiko`, payload, { headers });
                setselectedIdAnalisisRisiko(res.data.id);
                setLevel(res.data.level_risiko_actual || 0);
            }

            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Data Actual Risk berhasil disimpan',
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
                                        <label className="form-label">Skor Probabilitas <span className="text-danger">*</span></label>
                                        <SelectDropdownSkorKemungkinan
                                            className="rounded-3"
                                            options={skorKemungkinanOptions.map((item) => ({
                                                label: item.label,
                                                value: String(item.id),
                                                color: item.color,
                                                persentase: item.persentase,
                                            }))}
                                            selectedOption={selectedKriteriaSkorKemungkinan}
                                            onSelectOption={(option) => setSelectedKriteriaSkorKemungkinan(option)}
                                            defaultSelect={String(selectedKriteriaSkorKemungkinan)}
                                        />
                                    </div>
                                </div>
                                <div className="col-lg-12 mb-4">
                                    <div className="mb-4">
                                        <label className="form-label">Skor Dampak <span className="text-danger">*</span></label>
                                        <SelectDropdownSkorDampak
                                            className="rounded-3"
                                            options={skorDampakOptions.map((item) => ({
                                                label: item.label,
                                                value: String(item.id),
                                                color: item.color,
                                            }))}
                                            selectedOption={selectedKriteriaSkorDampak}
                                            onSelectOption={(option) => setSelectedKriteriaSkorDampak(option)}
                                            defaultSelect={String(selectedKriteriaSkorDampak)}
                                        />
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-lg-12">
                                        <h5 className="fw-bold">Level Risiko</h5>
                                    </div>
                                </div>
                                <div className="row mb-4">
                                    <div className="col-lg-1 mb-2">
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

export default ActualRiskContent;
