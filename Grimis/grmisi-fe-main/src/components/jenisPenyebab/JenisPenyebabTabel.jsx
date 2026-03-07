import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getJenisPenyebabColumns } from './JenisPenyebabColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';
import { useAuth } from "../../context/AuthContext";

const JenisPenyebabTabel = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [jenisPenyebab, setJenisPenyebab] = useState([]);
    const [selectedJenisPenyebab, setSelectedJenisPenyebab] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setErrorMessage("Token tidak ditemukan. Silakan login ulang.");
                    setLoading(false);
                    return;
                }

                // Validate instansi ID before using it
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
                    response = await axios.get(API_ENDPOINTS.getJenisPenyebabByInstansiAndIndukUnitKerja(idInstansi, idIndukUnitKerja), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else {
                    // Otherwise, just filter by instansi
                    response = await axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                }
                setJenisPenyebab(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi, idIndukUnitKerja]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/parameters/jenis-penyebab/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/jenis-penyebab/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedJenisPenyebab(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedJenisPenyebab) return;

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

            await axios.delete(API_ENDPOINTS.deleteJenisPenyebab(selectedJenisPenyebab.id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            showToast("success", "Jenis Penyebab berhasil dihapus!");
            setJenisPenyebab(prev => prev.filter(item => item.id !== selectedJenisPenyebab.id));
            setShowModal(false);
            setSelectedJenisPenyebab(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        }
    };

    const columns = useMemo(() => getJenisPenyebabColumns(handleActionClick, user), [handleActionClick, user]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <Table title={"Data Jenis Penyebab"} data={jenisPenyebab} columns={columns} />

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedJenisPenyebab && (
                        <>
                            <p>Yakin ingin menghapus Jenis Penyebab ini?</p>
                            <strong>Kode:</strong> {selectedJenisPenyebab.kode}<br />
                            <strong>Nama:</strong> {selectedJenisPenyebab.nama}<br />
                            <strong>Nama KLP:</strong> {selectedJenisPenyebab.nama_klp}<br />
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

export default JenisPenyebabTabel;
