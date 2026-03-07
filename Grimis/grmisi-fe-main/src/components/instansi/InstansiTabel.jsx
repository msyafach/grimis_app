import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { PropagateLoader } from 'react-spinners';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { getColumns } from './Columns';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const InstansiTabel = () => {
    const navigate = useNavigate();
    const [dataManajemenInstansi, setDataManajemenInstansi] = useState([]);
    const [selectedInstansi, setSelectedInstansi] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getInstansi, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataManajemenInstansi(response.data);
                setLoading(false);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/organisasi/instansi/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/organisasi/instansi/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedInstansi(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (selectedInstansi) {
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(API_ENDPOINTS.deleteInstansi(selectedInstansi.id), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                showToast("success", "Instansi Berhasil Dihapus!")
                setDataManajemenInstansi(dataManajemenInstansi.filter(user => user.id !== selectedInstansi.id));
                setShowModal(false);
                setSelectedInstansi(null);
                window.location.reload();
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
                showToast("error", errorResponse);
            }
        }
    };

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);
    if (loading) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                    <PropagateLoader color="#021526" loading={loading} size={15} />
                </div>
            ) : (
                <Table title={"Data Instansi"} data={dataManajemenInstansi} columns={columns} />
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInstansi && (
                        <>
                            <p>Apakah Anda yakin ingin menghapus instansi ini?</p>
                            <strong>Nama Instansi:</strong> {selectedInstansi.nama_instansi} <br />
                            <strong>Kode Instansi:</strong> {selectedInstansi.kode_instansi} <br />
                            <strong>Jenis:</strong> {selectedInstansi.jenis} <br />
                            <strong>Email:</strong> {selectedInstansi.email} <br />
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

export default InstansiTabel;
