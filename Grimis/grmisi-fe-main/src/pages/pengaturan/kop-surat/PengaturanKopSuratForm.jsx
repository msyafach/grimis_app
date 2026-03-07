import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { useInstansi } from '@/context/InstansiContext';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { showToast } from '@/utils/toast';

const PengaturanKopSuratForm = () => {
    const { idInstansi } = useInstansi();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [previewLogo, setPreviewLogo] = useState(null);

    const [formData, setFormData] = useState({
        kop_surat_baris_1: '',
        kop_surat_baris_2: '',
        kop_surat_baris_3: '',
        kop_surat_alamat: '',
        logo_instansi: null,
    });

    useEffect(() => {
        const fetchInstansiData = async () => {
            if (!idInstansi) return;
            setFetching(true);
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(`${API_ENDPOINTS.getInstansi}/${idInstansi}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = response.data;
                setFormData({
                    kop_surat_baris_1: data.kop_surat_baris_1 || '',
                    kop_surat_baris_2: data.kop_surat_baris_2 || '',
                    kop_surat_baris_3: data.kop_surat_baris_3 || '',
                    kop_surat_alamat: data.kop_surat_alamat || '',
                    logo_instansi: null // File input can't be set from URL
                });

                if (data.logo_instansi) {
                    setPreviewLogo(data.logo_instansi);
                }
            } catch (error) {
                console.error("Gagal mengambil data instansi:", error);
                showToast("error", "Gagal memuat pengaturan kop surat saat ini.");
            } finally {
                setFetching(false);
            }
        };

        fetchInstansiData();
    }, [idInstansi]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('error', 'File harus berupa gambar (PNG/JPG)');
                return;
            }
            // Validate size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showToast('error', 'Ukuran gambar maksimal 2MB');
                return;
            }

            setFormData(prev => ({ ...prev, logo_instansi: file }));

            // Generate preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewLogo(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const submitData = new FormData();

            submitData.append('kop_surat_baris_1', formData.kop_surat_baris_1);
            submitData.append('kop_surat_baris_2', formData.kop_surat_baris_2);
            submitData.append('kop_surat_baris_3', formData.kop_surat_baris_3);
            submitData.append('kop_surat_alamat', formData.kop_surat_alamat);

            if (formData.logo_instansi) {
                submitData.append('logo', formData.logo_instansi);
            }

            await axios.put(`${API_ENDPOINTS.getInstansi}/${idInstansi}/kop-surat`, submitData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            showToast("success", "Pengaturan Kop Surat berhasil disimpan!");
        } catch (error) {
            console.error("Error saving kop surat:", error);
            showToast("error", error.response?.data?.detail || "Gagal menyimpan pengaturan.");
        } finally {
            setLoading(false);
        }
    };

    if (!idInstansi) {
        return <Alert variant="warning">Silakan pilih Instansi/KLP terlebih dahulu di header.</Alert>;
    }

    if (fetching) {
        return <div>Memuat konfigurasi...</div>;
    }

    return (
        <Card>
            <Card.Header>
                <Card.Title>Pengaturan Kop Surat (Laporan PDF)</Card.Title>
            </Card.Header>
            <Card.Body>
                <Form onSubmit={handleSubmit}>
                    <Row className="mb-4">
                        <Col md={4} className="text-center">
                            <div className="mb-3">
                                <p className="fw-bold mb-2">Logo Instansi</p>
                                <div
                                    className="border rounded d-flex align-items-center justify-content-center bg-light"
                                    style={{ height: '150px', width: '150px', margin: '0 auto', overflow: 'hidden' }}
                                >
                                    {previewLogo ? (
                                        <img src={previewLogo} alt="Preview Logo" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                                    ) : (
                                        <span className="text-muted text-center p-2">Belum ada logo<br />(Max 2MB)</span>
                                    )}
                                </div>
                            </div>
                            <Form.Group>
                                <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    size="sm"
                                />
                                <Form.Text className="text-muted">Gunakan format PNG transparan untuk hasil PDF terbaik.</Form.Text>
                            </Form.Group>
                        </Col>

                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Kop Surat Baris 1 (Nama Organisasi Pemda)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="kop_surat_baris_1"
                                    value={formData.kop_surat_baris_1}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: PEMERINTAH DAERAH PROVINSI X"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Kop Surat Baris 2 (Nama Dinas/Instansi Utama)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="kop_surat_baris_2"
                                    value={formData.kop_surat_baris_2}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: INSPEKTORAT DAERAH"
                                    style={{ fontWeight: 'bold' }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Kop Surat Baris 3 (Tambahan Opsional)</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="kop_surat_baris_3"
                                    value={formData.kop_surat_baris_3}
                                    onChange={handleInputChange}
                                    placeholder="Contoh: UNIT PENGAWASAN INTERNAL"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Alamat Lengkap (Ditampilkan di bawah Kop)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    name="kop_surat_alamat"
                                    value={formData.kop_surat_alamat}
                                    onChange={handleInputChange}
                                    placeholder="Jalan Sudirman No. 1, Kota X, Kodepos 12345. Telp: (021) 123456"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <div className="text-end border-top pt-3">
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default PengaturanKopSuratForm;
