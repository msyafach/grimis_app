import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import { FaFilePdf, FaFileExcel, FaDownload } from 'react-icons/fa';
import axios from 'axios';
import API_ENDPOINTS from '../../../config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import { useAuth } from '@/context/AuthContext';
import { showToast } from '@/utils/toast';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';

const PelaporanRisiko = () => {
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();
    const { user } = useAuth();
    
    // Form state
    const [selectedUnitKerja, setSelectedUnitKerja] = useState("");
    const [unitKerjaList, setUnitKerjaList] = useState([]);
    
    // Fetch unit kerja list when component mounts or instansi changes
    useEffect(() => {
        if (!idInstansi) {
            showToast('error', 'Silakan pilih instansi terlebih dahulu di menu Instansi');
            return;
        }
        
        const fetchUnitKerja = async () => {
            setFormLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    showToast('error', 'Anda harus login terlebih dahulu');
                    return;
                }
                
                const response = await axios.get(
                    API_ENDPOINTS.getPelaporanRisikoIndukUnitKerja(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Filter out the "all" option if it exists
                const filteredUnitKerja = response.data.filter(unit => unit.id !== "all");
                setUnitKerjaList(filteredUnitKerja);
                
                // Auto-select current unit kerja if available
                if (idIndukUnitKerja && idIndukUnitKerja !== "all") {
                    setSelectedUnitKerja(idIndukUnitKerja);
                } else if (filteredUnitKerja.length > 0) {
                    // Select first unit kerja if no current selection
                    setSelectedUnitKerja(filteredUnitKerja[0].id);
                } else {
                    setSelectedUnitKerja("");
                }
                
            } catch (error) {
                console.error('Error fetching unit kerja:', error);
                showToast('error', 'Gagal memuat daftar unit kerja');
            } finally {
                setFormLoading(false);
            }
        };
        
        fetchUnitKerja();
    }, [idInstansi, idIndukUnitKerja]);

    const handleDownloadReport = async (format) => {
        if (!tahunId || !idInstansi || !selectedUnitKerja) {
            showToast('error', 'Silakan pilih unit kerja terlebih dahulu');
            return;
        }

        setLoading(true);
        
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast('error', 'Anda harus login terlebih dahulu');
                setLoading(false);
                return;
            }
            
            // Buat URL untuk download dengan format yang dipilih
            const downloadUrl = API_ENDPOINTS.downloadIdentifikasiRisiko(
                tahunId,
                idInstansi,
                selectedUnitKerja,
                format
            );
            
            // Gunakan axios untuk mengunduh file dengan header Authorization
            const response = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'blob', // Penting untuk menangani file binary
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            // Buat URL objek dari blob response
            const url = window.URL.createObjectURL(new Blob([response.data]));
            
            // Buat link untuk download dan klik secara otomatis
            const link = document.createElement('a');
            link.href = url;
            
            // Set nama file berdasarkan format
            const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
            link.setAttribute('download', `Risk_Register_${tahunId}.${fileExtension}`);
            
            document.body.appendChild(link);
            link.click();
            
            // Bersihkan setelah selesai
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            showToast('success', `Risk Register berhasil diunduh dalam format ${format === 'excel' ? 'Excel' : 'PDF'}`);
        } catch (error) {
            console.error('Error downloading report:', error);
            showToast('error', 'Gagal mengunduh laporan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <PageHeader>
                <div className="page-title">
                </div>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <div className="col-12">
                        <ContentLoaderWrapper loading={formLoading} error={null}>
                            <Row className="mb-4">
                                <Col>
                                    <Card>
                                        <Card.Body>
                                            <h5 className="card-title mb-3">Filter Laporan</h5>
                                            <Row>
                                                <Col md={12}>
                                                    {unitKerjaList.length > 0 ? (
                                                        <Form.Group className="mb-3">
                                                            <Form.Label>Unit Kerja</Form.Label>
                                                            <Form.Select
                                                                value={selectedUnitKerja}
                                                                onChange={(e) => setSelectedUnitKerja(e.target.value)}
                                                                disabled={formLoading}
                                                            >
                                                                {unitKerjaList.map((unit) => (
                                                                    <option key={unit.id} value={unit.id}>
                                                                        {unit.nama_induk_unit}
                                                                    </option>
                                                                ))}
                                                            </Form.Select>
                                                        </Form.Group>
                                                    ) : (
                                                        <div className="alert alert-info">
                                                            Tidak ada unit kerja yang tersedia untuk instansi ini.
                                                        </div>
                                                    )}
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            
                            <Row>
                                <Col md={6} lg={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Body>
                                            <h5 className="card-title mb-3">Risk Register</h5>
                                            <p className="card-text text-muted">
                                                Laporan risk register berisi daftar risiko yang telah diidentifikasi, 
                                                termasuk strategic objective & indicator, business process, risk ID, risk statement, 
                                                dan risk level dengan warna sesuai heatmap.
                                            </p>
                                        </Card.Body>
                                        <Card.Footer className="bg-white border-0 pt-0">
                                            {loading ? (
                                                <Button 
                                                    variant="warning" 
                                                    className="d-flex align-items-center gap-2"
                                                    disabled={true}
                                                >
                                                    <Spinner
                                                        as="span"
                                                        animation="border"
                                                        size="sm"
                                                        role="status"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="ms-2">Memproses...</span>
                                                </Button>
                                            ) : (
                                                <div className="d-flex gap-2">
                                                    <Button 
                                                        variant="warning" 
                                                        className="d-flex align-items-center gap-2"
                                                        onClick={() => handleDownloadReport('pdf')}
                                                        disabled={!tahunId || !idInstansi || !selectedUnitKerja || unitKerjaList.length === 0}
                                                    >
                                                        <FaFilePdf /> PDF
                                                    </Button>
                                                    
                                                    <Button 
                                                        variant="success" 
                                                        className="d-flex align-items-center gap-2"
                                                        onClick={() => handleDownloadReport('excel')}
                                                        disabled={!tahunId || !idInstansi || !selectedUnitKerja || unitKerjaList.length === 0}
                                                    >
                                                        <FaFileExcel /> Excel
                                                    </Button>
                                                </div>
                                            )}
                                        </Card.Footer>
                                    </Card>
                                </Col>
                                
                                {/* Placeholder untuk laporan lain di masa depan */}
                                {/* <Col md={6} lg={4} className="mb-4">
                                    <Card className="h-100">
                                        <Card.Body>
                                            <h5 className="card-title mb-3">Laporan Lainnya</h5>
                                            <p className="card-text text-muted">
                                                Deskripsi laporan lainnya...
                                            </p>
                                        </Card.Body>
                                        <Card.Footer className="bg-white border-0 pt-0">
                                            <Button 
                                                variant="warning" 
                                                className="d-flex align-items-center gap-2"
                                                disabled={true}
                                            >
                                                <FaFilePdf /> Cetak PDF
                                            </Button>
                                        </Card.Footer>
                                    </Card>
                                </Col> */}
                            </Row>
                        </ContentLoaderWrapper>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default PelaporanRisiko; 