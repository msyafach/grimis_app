import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getMetodeSpipColumns } from './MetodeSpipColumns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';

const MetodeSpipTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();
    const [metodeSpip, setMetodeSpip] = useState([]);
    const [selectedMetodeSpip, setSelectedMetodeSpip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setError("Token tidak tersedia. Silakan login ulang.");
                    setLoading(false);
                    return;
                }
                
                // Validate instansi ID before fetching data
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setError(instansiValidation.message);
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
                    response = await axios.get(API_ENDPOINTS.getMetodeSpipByIndukUnitKerja(idInstansi, tahunId, idIndukUnitKerja), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                } else {
                    // Otherwise, just filter by instansi
                    response = await axios.get(API_ENDPOINTS.getMetodeSpipAll(idInstansi, tahunId), {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                }
                setMetodeSpip(response.data);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [idInstansi, tahunId, idIndukUnitKerja]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/parameters/metode-spip/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/metode-spip/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedMetodeSpip(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedMetodeSpip) return;

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

            await axios.delete(API_ENDPOINTS.deleteMetodeSpip(selectedMetodeSpip.id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            showToast("success", "Metode SPIP berhasil dihapus!");
            setMetodeSpip(prev => prev.filter(item => item.id !== selectedMetodeSpip.id));
            setShowModal(false);
            setSelectedMetodeSpip(null);
        } catch (err) {
            showToast("error", "Gagal menghapus Metode SPIP.");
            console.error(err);
        }
    };

    const columns = useMemo(() => getMetodeSpipColumns(handleActionClick), [handleActionClick]);

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={error}>
                <Table title={"Data Metode SPIP"} data={metodeSpip} columns={columns} />
            </ContentLoaderWrapper>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedMetodeSpip && (
                        <>
                            <p>Yakin ingin menghapus Metode SPIP ini?</p>
                            <strong>Kode:</strong> {selectedMetodeSpip.kode}<br />
                            <strong>Nama:</strong> {selectedMetodeSpip.nama}<br />
                            <strong>Deskripsi:</strong> {selectedMetodeSpip.deskripsi}<br />
                            <strong>Nama KLP:</strong> {selectedMetodeSpip.nama_klp}<br />
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

export default MetodeSpipTabel;
