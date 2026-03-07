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
import { geKriteriaRisikoKemungkinanColumns } from './Columns';
import { validateIds } from '@/utils/validateIds';

setLanguage('id');

const KriteriaRisikoKemungkinanTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [kriteriaKemungkinan, setKriteriaKemungkinan] = useState([]);
    const [selectedKriteriaKemungkinan, setSelectedKriteriaKemungkinan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showModal, setShowModal] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem('access_token');
            
            // Validasi ID menggunakan utility validateIds
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                setErrorMessage(validationResult.message);
                setLoading(false);
                return;
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
                        console.log('Kriteria kemungkinan otomatis disinkronisasi dari template');
                    } catch (syncError) {
                        console.error("Gagal melakukan sinkronisasi otomatis:", syncError);
                        // Continue even if sync fails, we'll still show existing data
                    }
                }
            } catch (templateError) {
                console.warn("Gagal mencari template untuk sinkronisasi otomatis:", templateError);
                // Continue even if we can't find a template
            }
            
            // Get kriteria kemungkinan data
            const response = await axios.get(API_ENDPOINTS.getKriteriaRisikoKemungkinanByIndukUnitKerja(idInstansi, idIndukUnitKerja), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setKriteriaKemungkinan(response.data);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
        } finally {
            setLoading(false);
        }
    }, [idIndukUnitKerja, idInstansi]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/kriteria-risiko/kemungkinan/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/kriteria-risiko/kemungkinan/edit/${row.id}`);
                break;
            case 'delete':
                setSelectedKriteriaKemungkinan(row);
                setShowModal(true);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const handleDelete = async () => {
        if (!selectedKriteriaKemungkinan) return;
        try {
            const token = localStorage.getItem('access_token');
            
            // Validasi ID sebelum menghapus
            const validationResult = await validateIds(idInstansi, idIndukUnitKerja, token);
            if (!validationResult.valid) {
                showToast("error", validationResult.message);
                return;
            }
            
            await axios.delete(API_ENDPOINTS.deleteKriteriaRisikoKemungkinan(selectedKriteriaKemungkinan.id), {
                headers: { Authorization: `Bearer ${token}` },
            });

            showToast("success", "Kriteria Risiko Kemungkinan berhasil dihapus!");
            setKriteriaKemungkinan(prev => prev.filter(item => item.id !== selectedKriteriaKemungkinan.id));
            setShowModal(false);
            setSelectedKriteriaKemungkinan(null);
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            showToast("error", translatedError);
        }
    };

    const columns = useMemo(() => geKriteriaRisikoKemungkinanColumns(handleActionClick), [handleActionClick]);
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            {/* Main Table */}
            <Table 
                title={"Data Kriteria Risiko Kemungkinan"} 
                data={kriteriaKemungkinan} 
                columns={columns}
                defaultSorted={[{ id: 'nilai', desc: false }]}
                showAddButton={true}
                addButtonText="Tambah Kriteria Kemungkinan"
                addButtonAction={() => navigate('/kriteria-risiko/kemungkinan/tambah')}
            />
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedKriteriaKemungkinan && (
                        <>
                            <p>Yakin ingin menghapus Kriteria Risiko Kemungkinan ini?</p>
                            <strong>Kode:</strong> {selectedKriteriaKemungkinan.kode}<br />
                            <strong>Nama:</strong> {selectedKriteriaKemungkinan.nama}<br />
                            <strong>Nilai:</strong> {selectedKriteriaKemungkinan.nilai}<br />
                            <strong>Deskripsi:</strong> {selectedKriteriaKemungkinan.deskripsi}<br />
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

export default KriteriaRisikoKemungkinanTabel;
