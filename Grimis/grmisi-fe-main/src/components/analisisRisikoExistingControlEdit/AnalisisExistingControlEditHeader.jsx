import { useState, useEffect } from 'react';
import { Button, Modal, Form } from 'react-bootstrap';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../../config/apiConfig';

const AnalisisExistingControlEditHeader = ({ onUploadSuccess }) => {
    const { state } = useLocation();
    const { identifikasiId } = useParams();
    const navigate = useNavigate();
    
    const [analisisId, setAnalisisId] = useState(state?.analisisId);

    const [showModal, setShowModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [description, setDescription] = useState("");
    const [controlType, setControlType] = useState("PENGENDALIAN_DOKUMEN");
    const [fileError, setFileError] = useState("");

    useEffect(() => {
        // Jika analisisId tidak tersedia dari state, coba ambil dari API
        if (!analisisId && identifikasiId) {
            const fetchAnalisisId = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const headers = { Authorization: `Bearer ${token}` };
                    const tahun = new Date().getFullYear();
                    
                    const res = await axios.get(
                        API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoId(identifikasiId),
                        { headers }
                    );
                    
                    if (res.data && res.data.length > 0) {
                        setAnalisisId(res.data[0].id);
                    }
                } catch (err) {
                    console.error("Gagal mendapatkan analisisId:", err);
                }
            };
            
            fetchAnalisisId();
        }
    }, [analisisId, identifikasiId]);

    const handleUpload = async (e) => {
        e.preventDefault();
        setFileError("");
        
        if (!selectedFile) {
            setFileError("Silakan pilih file terlebih dahulu");
            return;
        }

        // Check file size (limit to 10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            setFileError("Ukuran file terlalu besar (maksimal 10MB)");
            return;
        }

        if (!analisisId) {
            showToast('error', 'ID Analisis Risiko tidak tersedia. Tidak dapat mengunggah file.');
            return;
        }

        try {
            setUploading(true);
            const token = localStorage.getItem('access_token');
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('unsur_spip_id', '');
            formData.append('deskripsi', description);
            formData.append('type', controlType);

            await axios.post(API_ENDPOINTS.postAnalisisRisikoAttachment(analisisId), formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });

            showToast('success', 'File berhasil diunggah!');
            setShowModal(false);
            setSelectedFile(null);
            setDescription("");
            setControlType("PENGENDALIAN_DOKUMEN");
            if (onUploadSuccess) onUploadSuccess(); // callback ke parent
        } catch (err) {
            console.error(err);
            showToast('error', 'Gagal mengunggah file');
        } finally {
            setUploading(false);
        }
    };

    const handleBack = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}`);
    };

    return (
        <>
            <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn bg-soft-danger text-danger" onClick={handleBack}>
                    <FiArrowLeft size={16} className="me-2" />
                    Kembali
                </button>
                <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => setShowModal(true)}
                    disabled={!analisisId}
                    title={!analisisId ? "ID Analisis Risiko tidak tersedia" : "Tambah Existing Control"}
                >
                    <FiPlus size={16} className="me-2" />
                    Tambah
                </button>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Unggah Existing Control</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleUpload}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Jenis Pengendalian</Form.Label>
                            <Form.Select 
                                value={controlType}
                                onChange={(e) => setControlType(e.target.value)}
                                required
                            >
                                <option value="PENGENDALIAN_FISIK">Pengendalian Fisik</option>
                                <option value="PENGENDALIAN_DOKUMEN">Pengendalian Dokumen</option>
                                <option value="PENGENDALIAN_APLIKASI">Pengendalian Aplikasi</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Deskripsi</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Masukkan deskripsi pengendalian"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group>
                            <Form.Label>File</Form.Label>
                            <Form.Control
                                type="file"
                                accept=".json,.pdf,.doc,.xls,.xlsx,.txt"
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                isInvalid={!!fileError}
                            />
                            {fileError && (
                                <Form.Control.Feedback type="invalid">
                                    {fileError}
                                </Form.Control.Feedback>
                            )}
                            <Form.Text className="text-muted">
                                Format file yang didukung: PDF, Word, Excel, Text, JSON (Maks. 10MB)
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Batal</Button>
                        <Button type="submit" variant="primary" disabled={uploading}>
                            {uploading ? "Mengunggah..." : "Unggah"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

export default AnalisisExistingControlEditHeader;
