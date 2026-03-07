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


const apiBaseUrl = "http://localhost:8000";
const idInstansi = "67baf4c72465ae8b7645ea5a";
const idIndukUnitKerja = "67bafa17b885deaafaac2656"
const idIdentifikasiRisiko = "67bb3e92682f1bd81f1e2430"
const idKriteriaKemungkinan = "67bb3787e0eca810c8ccde66"
const idAnalisisRisiko = "67bb415d55e2cc07c4a1b015"

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

    const [kemungkinanIdInherit, setKemungkinanIdInherit] = useState("67bb3787e0eca810c8ccde66");
    const [dampakIdInherit, setDampakIdInherit] = useState("67bb37f0e0eca810c8ccde6a");
    const [dataKriteriaKemungkinan, SetDataKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaKemungkinan, setSelectedKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaSkorKemungkinan, setSelectedKriteriaSkorKemungkinan] = useState(null);


    const [dataKriteriaDampak, SetDataKriteriaDampak] = useState([]);
    const [selectedKriteriaDampak, setSelectedKriteriaDampak] = useState(null);
    const [selectedKriteriaSkorDampak, setSelectedKriteriaSkorDampak] = useState(null);

    const [level, setLevel] = useState(1);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                const identifikasiRisikoResponse = await axios.get(`${apiBaseUrl}/api/v1/identifikasi-risiko?tahun=2025&id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const selectedIdIdentifikasiRisiko = identifikasiRisikoResponse.data.find(item => item.id === idIdentifikasiRisiko);
                if (selectedIdIdentifikasiRisiko) {
                    setSelectedIdentifikasiRisiko(selectedIdIdentifikasiRisiko);
                }

                const analisisRisikoResponse = await axios.get(`${apiBaseUrl}/api/v1/analisis-risiko/${idAnalisisRisiko}?tahun=2025`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (analisisRisikoResponse) {
                    setLevel(analisisRisikoResponse.data.level_risiko_inherit)
                    setSelectedKriteriaSkorKemungkinan(analisisRisikoResponse.data.skor_kemungkinan_inherit);
                    setSelectedKriteriaSkorDampak(analisisRisikoResponse.data.skor_dampak_inherit);
                }

                const kriteriaKemungkinanResponse = await axios.get(`${apiBaseUrl}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                SetDataKriteriaKemungkinan(kriteriaKemungkinanResponse.data)
                const selectedKemungkinan = kriteriaKemungkinanResponse.data.find(item => item.id === kemungkinanIdInherit);
                if (selectedKemungkinan) {
                    setSelectedKriteriaKemungkinan({
                        label: selectedKemungkinan.deskripsi,
                        value: selectedKemungkinan.id
                    });
                }

                const kriteriaDampakResponse = await axios.get(`${apiBaseUrl}/api/v1/kriteria-risiko/dampak?id_instansi=${idInstansi}&id_induk_unit_kerja=${idIndukUnitKerja}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                SetDataKriteriaDampak(kriteriaDampakResponse.data)
                const selectedDampak = kriteriaDampakResponse.data.find(item => item.id === dampakIdInherit);
                if (selectedDampak) {
                    setSelectedKriteriaDampak({
                        label: selectedDampak.deskripsi,
                        value: selectedDampak.id
                    });
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);


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
                                    <button className="btn btn-lg btn-primary" type="submit">
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
