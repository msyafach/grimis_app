import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { getColumns } from './Columns';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId } from '@/utils/validateIds';


const IndukUnitKerjaTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const [dataIndukUnitKerja, setDataIndukUnitKerja] = useState([]);
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const token = localStorage.getItem('access_token');

                // Validate instansi ID before using it
                const instansiValidation = await validateInstansiId(idInstansi, token);
                if (!instansiValidation.valid) {
                    setErrorMessage(instansiValidation.message);
                    setLoading(false);
                    return;
                }

                const response = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(idInstansi), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataIndukUnitKerja(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [idInstansi]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/organisasi/induk-unit-kerja/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/organisasi/induk-unit-kerja/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedIndukUnitKerja(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedIndukUnitKerja) return;

        try {
            const token = localStorage.getItem('access_token');

            // Validate instansi ID before proceeding with delete
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                return;
            }

            await axios.delete(API_ENDPOINTS.deleteIndukUnitKerja(selectedIndukUnitKerja.id), {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast("success", "Induk Unit Kerja berhasil dihapus!");
            setDataIndukUnitKerja(prev => prev.filter(item => item.id !== selectedIndukUnitKerja.id));
            setShowModal(false);
        } catch (err) {
            showToast("error", "Gagal menghapus Induk Unit Kerja.");
            console.error(err);
        }
    };

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={errorMessage}>
                <Table title="Data Induk Unit Kerja" data={dataIndukUnitKerja} columns={columns} />
            </ContentLoaderWrapper>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedIndukUnitKerja && (
                        <>
                            <p>Apa Anda yakin ingin menghapus Induk Unit Kerja ini?</p>
                            <strong>{selectedIndukUnitKerja.nama_induk_unit}</strong><br />
                            <small className="text-muted">Kode: {selectedIndukUnitKerja.kode_induk}</small>
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

export default IndukUnitKerjaTabel;
