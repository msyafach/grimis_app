import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getKamusRisikoColumns } from './KamusRisikoColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';
import { useAuth } from '../../context/AuthContext';

setLanguage('id');

const KamusRisikoTabel = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [kamusRisiko, setKamusRisiko] = useState([]);
    const [selectedKamusRisiko, setSelectedKamusRisiko] = useState(null);
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

                // Validate induk unit kerja ID if available
                if (idIndukUnitKerja) {
                    const indukUnitValidation = await validateIndukUnitKerjaId(idIndukUnitKerja, token);
                    if (!indukUnitValidation.valid) {
                        console.warn("Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi");
                    }
                }

                let response;
                if (idIndukUnitKerja) {
                    // If induk unit kerja is available, filter by both instansi and induk unit kerja
                    response = await axios.get(API_ENDPOINTS.getKamusRisikoByIndukUnitKerja(idInstansi, idIndukUnitKerja), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else {
                    // Otherwise, just filter by instansi
                    response = await axios.get(API_ENDPOINTS.getKamusRisikoAll(idInstansi), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                }
                setKamusRisiko(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi, idIndukUnitKerja]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/parameters/kamus-risiko/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/kamus-risiko/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedKamusRisiko(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedKamusRisiko) return;
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast("error", "Token tidak tersedia.");
                return;
            }

            // Validate instansi ID before proceeding with delete
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                return;
            }

            await axios.delete(API_ENDPOINTS.deleteKamusRisiko(selectedKamusRisiko.id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Kamus Risiko berhasil dihapus!");
            setKamusRisiko(prev => prev.filter(item => item.id !== selectedKamusRisiko.id));
            setShowModal(false);
            setSelectedKamusRisiko(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const columns = useMemo(() => getKamusRisikoColumns(handleActionClick, user), [handleActionClick, user]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <Table title={"Kamus Risiko"} data={kamusRisiko} columns={columns} />

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedKamusRisiko && (
                        <>
                            <p>Yakin ingin menghapus Kamus Risiko ini?</p>
                            <strong>Kode:</strong> {selectedKamusRisiko.kode}<br />
                            <strong>Nama:</strong> {selectedKamusRisiko.nama}<br />
                            <strong>Nama Kategori:</strong> {selectedKamusRisiko.nama_kategori}<br />
                            <strong>Nama KLP:</strong> {selectedKamusRisiko.nama_klp}<br />
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

export default KamusRisikoTabel;
