import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { useTranslate } from '@/utils/translate';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getBaganRisikoColumns } from './BaganRisikoColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

const BaganRisikoTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();
    const [baganRisiko, setBaganRisiko] = useState([]);
    const [selectedBaganRisiko, setSelectedBaganRisiko] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const translate = useTranslate();

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
                    response = await axios.get(API_ENDPOINTS.getBaganRisikoByIndukUnitKerja(idInstansi, tahunId, idIndukUnitKerja), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else {
                    // Otherwise, just filter by instansi
                    response = await axios.get(API_ENDPOINTS.getBaganRisikoAll(idInstansi, tahunId), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                }
                setBaganRisiko(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                const translatedError = translate(errorResponse);
                setErrorMessage(translatedError);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi, tahunId, idIndukUnitKerja]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/parameters/bagan-risiko/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/bagan-risiko/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedBaganRisiko(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedBaganRisiko) return;

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
            
            await axios.delete(API_ENDPOINTS.deleteBaganRisiko(selectedBaganRisiko.id), {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Bagan Risiko berhasil dihapus!");
            setBaganRisiko(prev => prev.filter(item => item.id !== selectedBaganRisiko.id));
            setShowModal(false);
            setSelectedBaganRisiko(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const columns = useMemo(() => getBaganRisikoColumns(handleActionClick), [handleActionClick]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <Table title={"Data Bagan Risiko"} data={baganRisiko} columns={columns} />
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedBaganRisiko && (
                        <>
                            <p>Yakin ingin menghapus Bagan Risiko ini?</p>
                            <strong>Kode:</strong> {selectedBaganRisiko.kode}<br />
                            <strong>Nama:</strong> {selectedBaganRisiko.nama}<br />
                            <strong>Deskripsi:</strong> {selectedBaganRisiko.deskripsi}<br />
                            <strong>Nama KLP:</strong> {selectedBaganRisiko.nama_klp}<br />
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

export default BaganRisikoTabel;
