import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { PropagateLoader } from 'react-spinners';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const GroupTable = () => {
    const navigate = useNavigate();
    const [dataGroups, setDataGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getGroups, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setDataGroups(response.data);
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
                navigate(`/groups/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/groups/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedGroup(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (selectedGroup) {
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(API_ENDPOINTS.deleteGroup(selectedGroup.id), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                showToast("success", "Group Berhasil Dihapus!");
                setDataGroups(dataGroups.filter(group => group.id !== selectedGroup.id));
                setShowModal(false);
                setSelectedGroup(null);
                window.location.reload();
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
                showToast("error", errorResponse);
            }
        }
    };

    const columns = useMemo(() => [
        {
            header: 'No',
            cell: (_, index) => index + 1,
        },
        {
            key: 'name',
            header: 'Nama Group',
        },
        {
            key: 'description',
            header: 'Deskripsi',
        },
        {
            key: 'member_count',
            header: 'Jumlah Anggota',
        },
        {
            header: 'Aksi',
            cell: (row) => (
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-sm btn-info"
                        onClick={() => handleActionClick('view', row)}
                    >
                        Lihat
                    </button>
                    <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleActionClick('edit', row)}
                    >
                        Edit
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleActionClick('delete', row)}
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ], [handleActionClick]);

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
                <Table title={"Data Group"} data={dataGroups} columns={columns} />
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Apakah Anda yakin ingin menghapus group "{selectedGroup?.name}"?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
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

export default GroupTable;
