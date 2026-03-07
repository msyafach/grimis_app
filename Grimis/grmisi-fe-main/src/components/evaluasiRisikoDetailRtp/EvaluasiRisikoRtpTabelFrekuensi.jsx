import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import TableEvaluasiRtp from '../shared/table/TableEvaluasiRtp';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getColumns } from './Columns';

setLanguage('id');

const EvaluasiRisikoRtpTabelFrekuensi = () => {
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const [evaluasiRtp, setEvaluasiRtp] = useState([]);
    const [evaluasiMap, setEvaluasiMap] = useState({});
    const [selectedEvaluasiRtp, setSelectedEvaluasiRtp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);

    const processEvaluasiRtpData = (rtpData, evaluasiMap) => {
        const mergedData = rtpData.map(item => ({
            ...item,
            evaluasi_risiko_detail: evaluasiMap[item.evaluasi_risiko_id] || null
        }));

        const groupedData = {};
        mergedData.forEach(item => {
            const key = item.evaluasi_risiko_detail?.deskripsi || 'Tidak Diketahui';
            if (!groupedData[key]) {
                groupedData[key] = [];
            }
            groupedData[key].push(item);
        });

        const processedData = [];
        Object.values(groupedData).forEach(group => {
            group.forEach((item, idx) => {
                processedData.push({
                    ...item,
                    rowSpan: idx === 0 ? group.length : 0,
                });
            });
        });

        return processedData;
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };
                const rtpRes = await axios.get(API_ENDPOINTS.getRtpFrekuensiByIdentifikasi(identifikasiId), { headers })
                const rtpData = rtpRes.data;

                const uniqueEvaluasiIds = [...new Set(rtpData.map(item => item.evaluasi_risiko_id))];

                const evaluasiPromises = uniqueEvaluasiIds.map(id =>
                    axios.get(API_ENDPOINTS.getEvaluasiRisikoById(id), { headers })
                );
                const evaluasiResponses = await Promise.all(evaluasiPromises);

                const newEvaluasiMap = {};
                evaluasiResponses.forEach((res, idx) => {
                    newEvaluasiMap[uniqueEvaluasiIds[idx]] = res.data;
                });

                setEvaluasiMap(newEvaluasiMap);
                const processed = processEvaluasiRtpData(rtpData, newEvaluasiMap);
                setEvaluasiRtp(processed);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [identifikasiId]);

    const handleActionClick = useCallback((action, row) => {
        const basePath = `/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/rtp`;
        const fromPath = `${basePath}`;

        switch (action) {
            case 'realisasi':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/rtp/realisasi/${row.id}`, {
                    state: { from: fromPath }
                });
                break;
            case 'view':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/rtp/detail/${row.id}`, {
                    state: { from: fromPath }
                });
                break;
            case 'edit':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/rtp/edit/${row.id}`, {
                    state: { from: fromPath }
                });
                break;
            case 'delete':
                setSelectedEvaluasiRtp(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [identifikasiId, navigate]);

    const handleDelete = async () => {
        if (!selectedEvaluasiRtp) return;
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(API_ENDPOINTS.deleteRtp(selectedEvaluasiRtp.id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "RTP Evaluasi Risiko berhasil dihapus!");

            const updated = evaluasiRtp.filter(item => item.id !== selectedEvaluasiRtp.id);
            const recalculated = processEvaluasiRtpData(updated, evaluasiMap);

            setEvaluasiRtp(recalculated);
            setSelectedEvaluasiRtp(null);
            setShowModal(false);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <TableEvaluasiRtp title={"RTP Mengurangi Frekuensi"} data={evaluasiRtp} columns={columns} />

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvaluasiRtp && (
                        <>
                            <p>Yakin ingin menghapus Risk Treatment Plan (RTP) ini?</p>
                            <strong>Deskripsi:</strong> {selectedEvaluasiRtp.deskripsi}<br />
                            <strong>Respon Risiko:</strong> {selectedEvaluasiRtp.respon_risiko}<br />
                            <strong>Rencana Aksi:</strong> {selectedEvaluasiRtp.rencana_aksi}<br />
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light-secondary" onClick={() => setShowModal(false)}>
                        Batal
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Hapus
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default EvaluasiRisikoRtpTabelFrekuensi;
