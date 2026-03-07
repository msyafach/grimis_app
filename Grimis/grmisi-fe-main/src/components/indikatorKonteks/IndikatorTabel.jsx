import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getIndikatorColumns } from './IndikatorColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';
import { useAuth } from "../../context/AuthContext";
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';

const IndikatorTabel = () => {
    const { handleRefresh, handleExpand } = useCardTitleActions();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedKonteks, setSelectedKonteks] = useState(null);
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { konteksSasaranId } = useParams();
    const [indikator, setIndikator] = useState([]);
    const [selectedIndikator, setSelectedIndikator] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setErrorMessage("Token tidak tersedia. Silakan login ulang.");
                    setLoading(false);
                    return;
                }

                // Validate instansi ID before fetching data
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                // If we have a specific konteks ID, use that
                if (konteksSasaranId) {
                    const response = await axios.get(API_ENDPOINTS.getIndikatorAll(konteksSasaranId, idInstansi), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    setIndikator(response.data);
                }
                // Otherwise, if we have indukUnitKerjaId, filter by that
                else if (idIndukUnitKerja) {
                    // Validate induk unit kerja ID
                    const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                    if (!indukUnitValidation.valid) {
                        console.warn("Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi");
                    }

                    const response = await axios.get(API_ENDPOINTS.getIndikatorByIndukUnitKerja(idInstansi, idIndukUnitKerja), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    setIndikator(response.data);
                }
                // If we have neither, show an error
                else {
                    setErrorMessage("Tidak ada ID konteks sasaran atau ID induk unit kerja yang valid.");
                }
            } catch (err) {
                console.error("Error fetching data:", err);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [konteksSasaranId, idInstansi, idIndukUnitKerja]);

    useEffect(() => {
        const fetchKonteksDetail = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;

                const response = await axios.get(API_ENDPOINTS.getKonteksSasaranById(konteksSasaranId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setSelectedKonteks(response.data);
            } catch (error) {
                console.error("Gagal mengambil data Konteks Sasaran:", error);
            }
        };

        if (konteksSasaranId) {
            fetchKonteksDetail();
        }
    }, [konteksSasaranId]);

    const handleActionClick = useCallback((action, row) => {
        const basePath = "/parameters/konteks-sasaran/indikator";
        switch (action) {
            case 'view':
                navigate(`${basePath}/${konteksSasaranId}/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`${basePath}/${konteksSasaranId}/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedIndikator(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate, konteksSasaranId]);

    const handleDelete = async () => {
        if (!selectedIndikator) return;
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast("error", "Token tidak tersedia. Silakan login ulang.");
                return;
            }

            // Validate instansi ID before proceeding with delete
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                return;
            }

            await axios.delete(API_ENDPOINTS.deleteIndikator(selectedIndikator.id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Indikator berhasil dihapus!");
            setIndikator(prev => prev.filter(item => item.id !== selectedIndikator.id));
            setShowModal(false);
            setSelectedIndikator(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        }
    };

    const columns = useMemo(() => getIndikatorColumns(handleActionClick, user), [handleActionClick, user]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <div className="card shadow-sm mt-3 mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center pt-2"
                    style={{
                        borderRadius: '0.5rem',
                    }}>
                    <h5 className="text-white">Detail Konteks Sasaran</h5>
                    <span className="badge bg-light text-dark">Total Indikator: {selectedKonteks.total_indikator}</span>
                </div>
                <div className="card-body ">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <p className="mb-1 text-muted">Kode</p>
                            <h6 className="fw-semibold">{selectedKonteks.kode}</h6>
                        </div>
                        <div className="col-md-6">
                            <p className="mb-1 text-muted">Nama</p>
                            <h6 className="fw-semibold">{selectedKonteks.nama}</h6>
                        </div>
                        <div className="col-md-6">
                            <p className="mb-1 text-muted">Jenis Konteks</p>
                            <span className="badge bg-info text-dark">{selectedKonteks.nama_jenis_konteks}</span>
                        </div>
                        <div className="col-md-6">
                            <p className="mb-1 text-muted">Nama KLP</p>
                            <span className="badge bg-warning text-dark">{selectedKonteks.nama_klp || "—"}</span>
                        </div>
                    </div>
                </div>
            </div>


            <Table title={"Data Indikator"} data={indikator} columns={columns} />

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedIndikator && (
                        <>
                            <p>Yakin ingin menghapus Indikator ini?</p>
                            <strong>Kode:</strong> {selectedIndikator.kode}<br />
                            <strong>Nama:</strong> {selectedIndikator.nama}<br />
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

export default IndikatorTabel;
