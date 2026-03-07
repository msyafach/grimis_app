import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from 'axios';
import { FiEdit3, FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import { showToast } from '@/utils/toast';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import API_ENDPOINTS from '@/config/apiConfig';

// Function to determine badge class based on RTP count
const getRtpBadgeClass = (rtpCount) => {
    if (typeof rtpCount === 'string' && rtpCount.includes('/')) {
        const [realized, total] = rtpCount.split('/').map(Number);
        if (realized > 0) {
            return realized === total ? 'bg-light-success text-success' : 'bg-light-warning text-warning';
        }
        return 'bg-light-danger text-danger';
    } else if (rtpCount > 0) {
        return 'bg-light-success text-success';
    }
    return 'bg-light-danger text-danger';
};

const RegisterRisikoEditContent = ({ title = "Edit Pernyataan Risiko" }) => {
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();

    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    if (isRemoved) return null;

    const [dataPernyataanRisiko, setDataPernyataanRisiko] = useState([]);
    const [selectedIdIndikator, setSelectedIdIndikator] = useState([]);
    const [selectedIndikator, setSelectedIndikator] = useState(null);
    const [dataIndikator, setDataIndikator] = useState([]);

    const [dataAnalisisRisiko, setDataAnalisisRisiko] = useState([]);
    const [ecCount, setEcCount] = useState([]);
    const [rtpCount, setRtpCount] = useState("0/0");

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                if (!idInstansi || !tahunId) return;
                const token = localStorage.getItem('access_token');
                // Get Identifikasi Risiko
                const identifikasiResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const identifikasiData = identifikasiResponse.data;
                if (!identifikasiData) {
                    throw new Error("Data identifikasi risiko tidak ditemukan atau Anda tidak memiliki akses.");
                }

                setSelectedIdIndikator(identifikasiData.id_indikator);
                const combinedData = { ...identifikasiData };

                const idKonteksSasaran = identifikasiData.id_konteks_sasaran;
                const konteksSasaranResponse = await axios.get(API_ENDPOINTS.getKonteksSasaranById(idKonteksSasaran), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const filteredKonteksSasaran = konteksSasaranResponse.data || null;
                combinedData.konteks_sasaran = filteredKonteksSasaran;

                const identikatorRespone = await axios.get(API_ENDPOINTS.getIndikatorAll(idKonteksSasaran, idInstansi), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataIndikator(identikatorRespone.data);
                const dataIndikator = identikatorRespone.data.find(item => item.id === identifikasiData.id_indikator);
                if (dataIndikator) {
                    setSelectedIndikator({
                        label: dataIndikator.nama,
                        value: dataIndikator.id,
                    });
                }

                const idKonteksProbis = identifikasiData.id_konteks_probis;
                const konteksProbisResponse = await axios.get(API_ENDPOINTS.getKonteksProbisById(idKonteksProbis), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const filteredKonteksProbis = konteksProbisResponse.data;
                combinedData.konteks_probis = filteredKonteksProbis;
                setDataPernyataanRisiko(combinedData);

                // Fetch Analisis Risiko
                const analisisResponse = await axios.get(
                    API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(identifikasiId),
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (analisisResponse.data.length > 0) {
                    const analisisData = analisisResponse.data[0];
                    setDataAnalisisRisiko(analisisData);

                    // Fetch EC (Existing Control) count for the Analisis
                    const existingControlRespon = await axios.get(
                        API_ENDPOINTS.getAnalisisRisikoAttachment(analisisData.id),
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    const ecData = existingControlRespon.data || [];
                    setEcCount(ecData.length || 0);

                    // Fetch Evaluasi Risiko and calculate RTP count
                    const evaluasiResponse = await axios.get(
                        API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiAnalisis(identifikasiId, analisisData.id),
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    );
                    const evaluasiData = evaluasiResponse.data || [];

                    // Calculate total RTP count in the format "realized/total"
                    let totalRealized = 0;
                    let totalPlanned = 0;

                    evaluasiData.forEach(item => {
                        if (typeof item.rtp_count === 'string' && item.rtp_count.includes('/')) {
                            // Parse the "realized/total" format
                            const [realized, total] = item.rtp_count.split('/').map(Number);
                            totalRealized += realized;
                            totalPlanned += total;
                        } else if (typeof item.rtp_count === 'number') {
                            // Legacy format - just add to total
                            totalPlanned += item.rtp_count || 0;
                        }
                    });

                    setRtpCount(`${totalRealized}/${totalPlanned}`);
                } else {
                    // If no Analisis Risiko, handle gracefully
                    setDataAnalisisRisiko(null);
                    setEcCount(0);
                    setRtpCount("0/0");
                }

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
                                            <FiEdit3 size={16} />
                                            Ubah
                                        </button>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Pernyataan Risiko</label>
                                            <input type="text" className="form-control form-control-sm rounded-4" value={dataPernyataanRisiko?.pernyataan_risiko || ''} disabled />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Sasaran</label>
                                            <input type="text" className="form-control form-control-sm  rounded-4" value={dataPernyataanRisiko?.konteks_sasaran?.nama || dataPernyataanRisiko?.nama_sasaran || ''} disabled />
                                        </div>
                                    </div>
                                    <div className="col-lg-12">
                                        <div className="mb-4">
                                            <label className="form-label">Indikator <span className="text-danger">*</span></label>
                                            <SelectDropdownCustom
                                                className=" rounded-4"
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
                                            <input type="text" className="form-control form-control-sm rounded-4" value={dataPernyataanRisiko?.konteks_probis?.nama || dataPernyataanRisiko?.nama_probis || ''} disabled />
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
                                                    <span className="ms-3 fs-5 text-center">{dataAnalisisRisiko?.level_risiko_inherit || '-'}</span>
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
                                                    <span className="ms-3 fs-5 text-center">{dataAnalisisRisiko?.level_risiko_residual || '-'}</span>
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
                                                    <span className="ms-3 fs-5 text-center">{dataAnalisisRisiko?.level_risiko_treated || '-'}</span>
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
                                                    <span className="ms-3 fs-5 text-center">0</span>
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
                                                    <span className="ms-3 fs-5 text-center">{ecCount}</span>
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
                                                <span className={`badge ${getRtpBadgeClass(rtpCount)} rounded-4 p-2 w-100 d-flex justify-content-between align-items-center`}>
                                                    <span className="ms-3 fs-5 text-center">{rtpCount}</span>
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

export default RegisterRisikoEditContent;
