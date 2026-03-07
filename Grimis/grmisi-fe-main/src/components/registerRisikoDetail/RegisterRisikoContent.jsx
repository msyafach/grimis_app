import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiEdit3, FiSave, FiArrowLeft } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import Swal from 'sweetalert2';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdown from '@/components/shared/SelectDropdown';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import API_ENDPOINTS from '@/config/apiConfig';

const RegisterRisikoDetailContent = ({ title = "Detail Pernyataan Risiko" }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const analisisId = location.state?.analisisId;

    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    if (isRemoved) return null;

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);
    const [selectedIdIndikator, setSelectedIdIndikator] = useState([]);
    const [selectedIndikator, setSelectedIndikator] = useState(null);
    const [dataIndikator, setDataIndikator] = useState([]);


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                if (!idInstansi || !tahunId) return;
                const token = localStorage.getItem('access_token');

                const identifikasiResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/identifikasi-risiko?tahun=${tahunId}&id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const identifikasiData = identifikasiResponse.data.find(item => item.id === identifikasiId);

                if (!identifikasiData) {
                    throw new Error("Data identifikasi risiko tidak ditemukan atau Anda tidak memiliki akses.");
                }

                setSelectedIdIndikator(identifikasiData.id_indikator)
                const combinedData = { ...identifikasiData };

                const idKonteksSasaran = identifikasiData.id_konteks_sasaran
                const konteksSasaranResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/konteks?id_instansi=${idInstansi}&jenis=SASARAN`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                const filteredKonteksSasaran = konteksSasaranResponse.data.find(item => item.id === idKonteksSasaran);
                combinedData.konteks_sasaran = filteredKonteksSasaran || null;

                const identikatorRespone = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/indikator?id_konteks=${idKonteksSasaran}&id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setDataIndikator(identikatorRespone.data)
                const dataIndikator = identikatorRespone.data.find(item => item.id === identifikasiData.id_indikator);
                if (dataIndikator) {
                    console.log("Masuk")
                    setSelectedIndikator({
                        label: dataIndikator.nama,
                        value: dataIndikator.id
                    });
                }

                const idKonteksProbis = identifikasiData.id_konteks_probis
                const konteksProbisResponse = await axios.get(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/konteks?id_instansi=${idInstansi}&jenis=PROBIS`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                });
                const filteredKonteksProbis = konteksProbisResponse.data.find(item => item.id === idKonteksProbis);
                combinedData.konteks_probis = filteredKonteksProbis;
                setDataPernyataanRisiko(combinedData);

            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [identifikasiId, tahunId, idInstansi]);

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
                                    <div className="col-lg-8">
                                        <h5 className="fw-bold">Pemilik</h5>
                                    </div>
                                    <div className="col-lg-4 d-flex justify-content-end">
                                        <button
                                            className="btn btn-md btn-primary"
                                            type="button"
                                        >
                                            <FiEdit3 size={16} />   Ubah
                                        </button>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Pernyataan Risiko</label>
                                            <input type="text" className="form-control" value={dataPernyataanRisiko.pernyataan_risiko} readOnly />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Sasaran</label>
                                            <input type="text" className="form-control" value={dataPernyataanRisiko?.konteks_sasaran?.nama || dataPernyataanRisiko?.nama_sasaran || ''} readOnly />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Indikator <span className="text-danger">*</span></label>
                                            <SelectDropdownCustom
                                                className="rounded-3"
                                                options={dataIndikator?.map((item) => ({
                                                    label: item.nama,
                                                    value: String(item.id),
                                                })) || []}
                                                selectedOption={selectedIndikator}
                                                onSelectOption={(option) => setSelectedIndikator(option)}
                                                defaultSelect={String(selectedIndikator)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Probis</label>
                                            <input type="text" className="form-control" value={dataPernyataanRisiko?.konteks_probis?.nama || dataPernyataanRisiko?.nama_probis || ''} readOnly />
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-lg-12">
                                        <h5 className="fw-bold">Level</h5>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Inherent Risk</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">3</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Residual Risk</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">2</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Treated Risk</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">1</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Actual Risk</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">1</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="col-lg-12">
                                        <h5 className="fw-bold">Pengendalian</h5>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Existing Control</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">2</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-3">
                                        <div className="mb-4">
                                            <label className="form-label">Risk Treatment Plan (RTP)</label>
                                            <div className="d-flex align-items-center">
                                                <span className="badge bg-light-success text-success rounded-4 p-2 w-100 d-flex justify-content-between align-items-center">
                                                    <span className="ms-3 fs-5 text-center">1</span>
                                                    <button className="btn btn-sm btn-primary ms-2" type="button">
                                                        <FiEdit3 size={16} />
                                                    </button>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn btn-lg bg-soft-danger text-danger" type="button" onClick={() => navigate(`/pengelolaan-risiko/registrasi-risiko`)}>
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

export default RegisterRisikoDetailContent;
