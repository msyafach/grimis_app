import { useEffect, useState } from 'react';
import { useLocation, useParams } from "react-router-dom";
import axios from 'axios';
import PropTypes from 'prop-types';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { skorColorMap, getLevelBadgeClass } from '@/utils/color';
import { validateIds } from '@/utils/validateIds';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';

const ActualRiskContent = ({ title = "Skor / Nilai Actual Risk" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { state } = useLocation();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();
    const analisisId = state?.analisisId;

    const [identifikasi, setIdentifikasi] = useState({});
    const [actual, setActual] = useState(null);

    const [selectedKemungkinan, setSelectedKemungkinan] = useState(null);
    const [selectedDampak, setSelectedDampak] = useState(null);
    const [selectedSkorKemungkinan, setSelectedSkorKemungkinan] = useState(null);
    const [selectedSkorDampak, setSelectedSkorDampak] = useState(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
                if (!validationResult.valid) {
                    showToast("error", validationResult.message);
                    return;
                }

                const [indentifikasiRes, kemungkinanRes, dampakRes, actualRes, skorFreqRes, skorDampakRes, matriksRes] = await Promise.all([
                    axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers }),
                    axios.get(API_ENDPOINTS.getKriteriaRisikoKemungkinanAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getKriteriaRisikoDampakAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getAnalisisRisikoActual(analisisId), { headers }),
                    axios.get(API_ENDPOINTS.getPetaKategoriFrekuensi(idTemplate), { headers }),
                    axios.get(API_ENDPOINTS.getPetaKategoriDampak(idTemplate), { headers }),
                    axios.get(API_ENDPOINTS.getPetaMatriks(idTemplate), { headers }),
                ]);
                setIdentifikasi(indentifikasiRes.data)

                setSelectedKemungkinan({
                    label: kemungkinanRes.data.find(k => k.id === actualRes.data.kemungkinan_id)?.deskripsi || '',
                    value: actualRes.data.kemungkinan_id
                });
                setSelectedDampak({
                    label: dampakRes.data.find(d => d.id === actualRes.data.dampak_id)?.deskripsi || '',
                    value: actualRes.data.dampak_id
                });

                const matriksKemungkinan = matriksRes.data.filter(item => item.jenis === "FREKUENSI");
                const persentaseKemungkinan = matriksKemungkinan.find(item =>
                    parseInt(item.kategori) === parseInt(actualRes.data.skor_kemungkinan) &&
                    parseInt(item.klasifikasi) === 1 // klasifikasi default bisa disesuaikan
                )?.value;
                setSelectedSkorKemungkinan({
                    value: actualRes.data.skor_kemungkinan,
                    label: skorFreqRes.data.find(item => parseInt(item.key) === parseInt(actualRes.data.skor_kemungkinan))?.value || '',
                    color: skorColorMap[actualRes.data.skor_kemungkinan] || 'bg-secondary',
                    persentase: persentaseKemungkinan || ''
                });

                setSelectedSkorDampak({
                    value: actualRes.data.skor_dampak,
                    label: skorDampakRes.data.find(item => parseInt(item.key) === parseInt(actualRes.data.skor_dampak))?.value || '',
                    color: skorColorMap[actualRes.data.skor_dampak] || 'bg-secondary'
                });

                setActual(actualRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [identifikasiId, analisisId, idInstansi, idTemplate, idIndukUnitKerja]);


    if (isRemoved) return null;

    const level = actual?.level_risiko || 0;
    const badgeClass = getLevelBadgeClass(level);

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <ContentLoaderWrapper loading={loading} error={errorMessage}>
                        <div className="row">
                            <div className="col-12">
                                <h5 className="fw-bold">{identifikasi?.pernyataan_risiko}</h5>
                                <p>{identifikasi?.deskripsi}</p>
                            </div>
                        </div>
                        <form >
                            <div className="mb-4">
                                <label className="form-label">Kriteria Kemungkinan</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4 bg-light"
                                    value={selectedKemungkinan?.label || "-"}
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Skor Kemungkinan</label>
                                <div className="form-control form-control-sm rounded-4 d-flex align-items-center gap-2 bg-light">
                                    <span>{selectedSkorKemungkinan?.label || ''}</span>
                                    {selectedSkorKemungkinan?.persentase && (
                                        <span className={`badge ${selectedSkorKemungkinan.color}`}>
                                            {selectedSkorKemungkinan.persentase}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Kriteria Dampak</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4 bg-light"
                                    value={selectedDampak?.label || "-"}
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label">Skor Dampak</label>
                                <div className="form-control form-control-sm rounded-4 d-flex align-items-center gap-2 bg-light">
                                    <span className={`badge ${selectedSkorDampak?.color} me-2 px-2 py-1`}>&nbsp;</span>
                                    <span>{selectedSkorDampak?.label || ''}</span>
                                    {selectedSkorDampak?.persentase && (
                                        <span className={`badge ${selectedSkorDampak.color}`}>
                                            {selectedSkorDampak.persentase}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Level Risiko</label><br />
                                <span className={`badge ${badgeClass} rounded-4 py-2 px-2 fs-5 w-25 text-center`}>
                                    {level}
                                </span>
                            </div>
                        </form>
                    </ContentLoaderWrapper>
                </div>
            </div>
        </>
    );
};

ActualRiskContent.propTypes = {
    title: PropTypes.string,
};

export default ActualRiskContent;
