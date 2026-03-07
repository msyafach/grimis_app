import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { getColumns } from './Columns';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { validateInstansiId } from '@/utils/validateIds';
import { useAuth } from "../../context/AuthContext";

const StrukturOrganisasiTabel = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [dataStrukturOrganisasi, setDataStrukturOrganisasi] = useState([]);
    const [selectedStrukturOrganisasi, setSelectedStrukturOrganisasi] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Function to organize data in hierarchical order
    const organizeHierarchically = (data) => {
        // Create a map of kode to struktur for quick lookup
        const strukturMap = new Map();
        data.forEach(struktur => strukturMap.set(struktur.kode, { ...struktur, level: 0, children: [] }));

        // Identify root nodes (structures without a parent) and build hierarchy
        const rootNodes = [];
        const processedNodes = new Set();

        // First pass: identify parent-child relationships
        data.forEach(struktur => {
            const node = strukturMap.get(struktur.kode);

            if (!struktur.kode_induk) {
                // This is a root node
                rootNodes.push(node);
            } else if (strukturMap.has(struktur.kode_induk)) {
                // This has a parent in our data
                const parent = strukturMap.get(struktur.kode_induk);
                parent.children.push(node);
            } else {
                // Parent not found, treat as root
                rootNodes.push(node);
            }
        });

        // Function to flatten the hierarchy with level information
        const flattenHierarchy = (nodes, level = 0, result = []) => {
            nodes.forEach(node => {
                const nodeWithLevel = { ...node, level };
                result.push(nodeWithLevel);
                processedNodes.add(node.kode);

                if (node.children && node.children.length > 0) {
                    flattenHierarchy(node.children, level + 1, result);
                }
            });
            return result;
        };

        // Flatten the hierarchy starting from root nodes
        let result = flattenHierarchy(rootNodes);

        // Add any nodes that weren't processed (orphans)
        data.forEach(struktur => {
            if (!processedNodes.has(struktur.kode)) {
                result.push({ ...struktur, level: 0 });
            }
        });

        return result;
    };

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

                const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasibyInstansi(idInstansi), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                // Organize data hierarchically
                const organizedData = organizeHierarchically(response.data);
                setDataStrukturOrganisasi(organizedData);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [idIndukUnitKerja, idInstansi]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'setting':
                navigate(`/parameters/struktur-organisasi/users/${row.id}`);
                break;
            case 'view':
                navigate(`/parameters/struktur-organisasi/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/parameters/struktur-organisasi/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedStrukturOrganisasi(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedStrukturOrganisasi) return;

        try {
            const token = localStorage.getItem('access_token');

            // Validate instansi ID before proceeding with delete
            const instansiValidation = await validateInstansiId(idInstansi, token);
            if (!instansiValidation.valid) {
                showToast("error", instansiValidation.message);
                return;
            }

            await axios.delete(API_ENDPOINTS.deleteStrukturOrganisasi(selectedStrukturOrganisasi.id), {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast("success", "Struktur Organisasi berhasil dihapus!");
            setDataStrukturOrganisasi(prev => prev.filter(item => item.id !== selectedStrukturOrganisasi.id));
            setShowModal(false);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        }
    };

    const columns = useMemo(() => getColumns(handleActionClick, user), [handleActionClick, user]);

    // Modify the columns to show indentation based on hierarchy level
    const hierarchicalColumns = useMemo(() => {
        const modifiedColumns = [...columns];

        // Find the 'nama' column and modify its cell renderer
        const namaColumnIndex = modifiedColumns.findIndex(col => col.accessorKey === 'nama');
        if (namaColumnIndex !== -1) {
            const originalCell = modifiedColumns[namaColumnIndex].cell;

            modifiedColumns[namaColumnIndex].cell = (info) => {
                const row = info.row.original;
                const level = row.level || 0;
                const indent = level * 20; // 20px per level of hierarchy

                return (
                    <div style={{ paddingLeft: `${indent}px` }}>
                        {originalCell ? originalCell(info) : info.getValue()}
                    </div>
                );
            };
        }

        return modifiedColumns;
    }, [columns]);

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={errorMessage}>
                <Table title="Data Struktur Organisasi" data={dataStrukturOrganisasi} columns={hierarchicalColumns} />
            </ContentLoaderWrapper>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedStrukturOrganisasi && (
                        <>
                            <p>Apa Anda yakin ingin menghapus struktur organisasi ini?</p>
                            <strong>{selectedStrukturOrganisasi.nama}</strong> ({selectedStrukturOrganisasi.kode})<br />
                            <small className="text-muted">Pimpinan: {selectedStrukturOrganisasi.pimpinan}</small><br />
                            <small className="text-muted">Jabatan: {selectedStrukturOrganisasi.jabatan_pimpinan}</small>
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

export default StrukturOrganisasiTabel;
