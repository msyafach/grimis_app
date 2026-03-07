import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import TableResgitrasiRisiko from '@/components/shared/table/TableRegistrasiRisiko';
import { showToast } from '@/utils/toast';
import { validateIds } from '@/utils/validateIds';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getIdentifikasiRisikoColumns } from './IdentifikasiRisikoColumns';
import { useAuth } from "../../context/AuthContext";

const IdentifikasiRisikoTabel = () => {
    const { user } = useAuth();
    const { handleRefresh, handleExpand } = useCardTitleActions();
    const navigate = useNavigate();
    const location = useLocation();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();
    const [identifikasiRisiko, setIdentifikasiRisiko] = useState([]);
    const [filteredRisiko, setFilteredRisiko] = useState([]);
    const [selectedIdentifikasiRisiko, setSelectedIdentifikasiRisiko] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Get query parameters
    const queryParams = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            frekuensi: params.get('frekuensi'),
            dampak: params.get('dampak')
        };
    }, [location.search]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem('access_token');

                // Validasi tahun
                if (!tahunId) {
                    setError("Tahun belum dipilih");
                    setLoading(false);
                    return;
                }

                // Validasi instansi dan induk unit kerja menggunakan validateIds
                const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
                if (!validationResult.valid) {
                    setError(validationResult.message);
                    setLoading(false);
                    return;
                }

                // Always fetch all identifikasi risiko data first
                const identifikasiResponse = await axios.get(
                    API_ENDPOINTS.getIdentifikasiRisikoSummaryByIdentifikasi(idInstansi, idIndukUnitKerja, tahunId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
                );
                const identifikasiData = identifikasiResponse.data || [];
                setIdentifikasiRisiko(identifikasiData);

                // Check if we have frequency and impact query parameters
                if (queryParams.frekuensi && queryParams.dampak) {
                    // Get the IDs of risks in the selected cell
                    const cellRisksResponse = await axios.get(
                        API_ENDPOINTS.getPetaRisksByCell(
                            tahunId,
                            queryParams.frekuensi,
                            queryParams.dampak,
                            idInstansi,
                            idIndukUnitKerja
                        ), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                    );

                    // Extract the identifikasi risiko IDs from the cell-risks response
                    const cellRisksData = cellRisksResponse.data || [];
                    const identifikasiIds = cellRisksData.map(item => item.id_identifikasi);

                    // Filter the complete identifikasi data to only include the IDs from cell-risks
                    const filtered = identifikasiData.filter(item =>
                        identifikasiIds.includes(item.id_identifikasi)
                    );

                    setFilteredRisiko(filtered);
                } else {
                    // No filter, show all data
                    setFilteredRisiko(identifikasiData);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [idIndukUnitKerja, idInstansi, tahunId, queryParams]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'detail':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${row.id_identifikasi}`);
                break;
            case 'edit':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${row.id_identifikasi}`);
                break;
            case 'delete':
                setSelectedIdentifikasiRisiko(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedIdentifikasiRisiko) return;

        try {
            const token = localStorage.getItem('access_token');

            // Validasi instansi dan induk unit kerja sebelum menghapus
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            const analisisResponse = await axios.get(
                API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(selectedIdentifikasiRisiko.id_identifikasi),
                { headers }
            );
            const analisisId = analisisResponse?.data?.id;
            if (analisisId) {
                await axios.delete(API_ENDPOINTS.deleteAnalisisRisikoById(analisisId), { headers });
            }

            await axios.delete(API_ENDPOINTS.deleteIdentifikasiRisiko(selectedIdentifikasiRisiko.id_identifikasi), {
                headers
            });

            showToast("success", "Identifikasi dan Analisis Risiko berhasil dihapus!");
            setIdentifikasiRisiko(prev => prev.filter(item => item.id !== selectedIdentifikasiRisiko.id_identifikasi));
            setFilteredRisiko(prev => prev.filter(item => item.id !== selectedIdentifikasiRisiko.id_identifikasi));
            setShowModal(false);
            setSelectedIdentifikasiRisiko(null);
        } catch (err) {
            showToast("error", "Gagal menghapus Identifikasi atau Analisis Risiko.");
            console.error(err);
        }
    };

    const columns = useMemo(() => getIdentifikasiRisikoColumns(handleActionClick, user), [handleActionClick, user]);

    // Create a title that shows if we're filtering
    const tableTitle = useMemo(() => {
        if (queryParams.frekuensi && queryParams.dampak) {
            return `Identifikasi Risiko (Frekuensi: ${queryParams.frekuensi}, Dampak: ${queryParams.dampak})`;
        }
        return "Identifikasi Risiko";
    }, [queryParams]);

    // Function to clear the filter
    const clearFilter = () => {
        navigate('/pengelolaan-risiko/identifikasi-risiko');
    };

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={error}>
                {filteredRisiko.length === 0 && !loading ? (
                    <>
                        <div className="col-lg-12">
                            <div className="card stretch stretch-full">
                                <CardHeader title={tableTitle} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                                <div className="card-body">
                                    {queryParams.frekuensi && queryParams.dampak && (
                                        <Button variant="outline-secondary" size="sm" onClick={clearFilter}>
                                            <i className="bi bi-x-circle me-1"></i> Hapus Filter
                                        </Button>
                                    )}
                                    <div className="alert alert-info mt-3">
                                        {queryParams.frekuensi && queryParams.dampak
                                            ? `Tidak ada data risiko untuk Frekuensi ${queryParams.frekuensi} dan Dampak ${queryParams.dampak}`
                                            : "Tidak ada data risiko yang tersedia"
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <TableResgitrasiRisiko title={tableTitle} data={filteredRisiko} columns={columns} />
                )}
            </ContentLoaderWrapper>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedIdentifikasiRisiko && (
                        <>
                            <p>Yakin ingin menghapus Pernyataan Risiko ini?</p>
                            <strong>{selectedIdentifikasiRisiko.pernyataan_risiko}</strong><br />
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

export default IdentifikasiRisikoTabel;
