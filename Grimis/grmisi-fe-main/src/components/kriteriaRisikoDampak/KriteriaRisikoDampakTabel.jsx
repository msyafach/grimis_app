import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import Table from '@/components/shared/table/Table';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getColumns } from './Columns';
import { validateInstansiId, validateIndukUnitKerjaId } from '@/utils/validateIds';
import { useAuth } from "../../context/AuthContext";

const KriteriaRisikoDampakTabel = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [kriteriaDampak, setKriteriaDampak] = useState([]);
    const [selectedKriteriaDampak, setSelectedKriteriaDampak] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setErrorMessage("Token tidak ditemukan. Silakan login ulang.");
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
            
            // Get the current year
            const currentYear = new Date().getFullYear();
            
            // Try to find appropriate template for auto-sync
            try {
                const templatesResponse = await axios.get(
                    API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(currentYear, idIndukUnitKerja), 
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                
                const templates = Array.isArray(templatesResponse.data) 
                    ? templatesResponse.data 
                    : [];
                
                // If we found a template, automatically sync from it
                if (templates.length > 0) {
                    const templateId = templates[0].id;
                    try {
                        await axios.post(
                            API_ENDPOINTS.syncKriteriaRisikoFromTemplate(idInstansi, idIndukUnitKerja, templateId),
                            {},
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            }
                        );
                        console.log('Kriteria dampak otomatis disinkronisasi dari template');
                    } catch (syncError) {
                        console.error("Gagal melakukan sinkronisasi otomatis:", syncError);
                        // Continue even if sync fails, we'll still show existing data
                    }
                }
            } catch (templateError) {
                console.warn("Gagal mencari template untuk sinkronisasi otomatis:", templateError);
                // Continue even if we can't find a template
            }

            const response = await axios.get(
                API_ENDPOINTS.getKriteriaRisikoDampakByIndukUnitKerja(idInstansi, idIndukUnitKerja),
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            setKriteriaDampak(response.data);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
        } finally {
            setLoading(false);
        }
    }, [idInstansi, idIndukUnitKerja]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/kriteria-risiko/dampak/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/kriteria-risiko/dampak/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedKriteriaDampak(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedKriteriaDampak) return;

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

            await axios.delete(API_ENDPOINTS.deleteKriteriaRisikoDampak(selectedKriteriaDampak.id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            showToast("success", "Kriteria Risiko Dampak berhasil dihapus!");
            setKriteriaDampak(prev => prev.filter(item => item.id !== selectedKriteriaDampak.id));
            setShowModal(false);
            setSelectedKriteriaDampak(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        }
    };

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);
    
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            {/* Main Table */}
            <Table 
                title="Data Kriteria Risiko Dampak" 
                data={kriteriaDampak} 
                columns={columns}
                defaultSorted={[{ id: 'nilai', desc: false }]}
                showAddButton={true}
                addButtonText="Tambah Kriteria Dampak"
                addButtonAction={() => navigate('/kriteria-risiko/dampak/tambah')}
            />

            {/* Delete Confirmation Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedKriteriaDampak && (
                        <>
                            <p>Yakin ingin menghapus kriteria risiko dampak ini?</p>
                            <strong>Kode:</strong> {selectedKriteriaDampak.kode}<br />
                            <strong>Nama:</strong> {selectedKriteriaDampak.nama}<br />
                            <strong>Nilai:</strong> {selectedKriteriaDampak.nilai}<br />
                            <strong>Deskripsi:</strong> {selectedKriteriaDampak.deskripsi}<br />
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

export default KriteriaRisikoDampakTabel;
