import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import { showToast } from '@/utils/toast';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import { FiPlus, FiMinus, FiEdit2, FiSave } from 'react-icons/fi';

const KriteriaRisikoDampakMatrix = () => {
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const { tahunId } = useTahun();

    const [loading, setLoading] = useState(false);
    const [template, setTemplate] = useState(null);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [jenisKriteriaList, setJenisKriteriaList] = useState([]);
    const [matrixData, setMatrixData] = useState({});

    // Modal states
    const [showKategoriModal, setShowKategoriModal] = useState(false);
    const [showPenjelasanModal, setShowPenjelasanModal] = useState(false);
    const [showKriteriaModal, setShowKriteriaModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);

    // Form states
    const [kategoriForm, setKategoriForm] = useState({ key: '', nama: '' });
    const [penjelasanForm, setPenjelasanForm] = useState({ id: '', penjelasan: '' });
    const [kriteriaForm, setKriteriaForm] = useState({
        kategori_id: '',
        jenis_kriteria_id: '',
        kriteria: '',
        formula: ''
    });
    const [newJenisKriteria, setNewJenisKriteria] = useState('');

    const token = localStorage.getItem('access_token');

    // Fetch template and initial data
    const fetchData = useCallback(async () => {
        if (!idInstansi || !idIndukUnitKerja || !tahunId) return;

        setLoading(true);
        try {
            // Get template
            const templateRes = await axios.get(
                API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahunId, idIndukUnitKerja),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (templateRes.data && templateRes.data.length > 0) {
                const tmpl = templateRes.data[0];
                setTemplate(tmpl);

                // Get kategori dampak
                const kategoriRes = await axios.get(
                    API_ENDPOINTS.getPetaKategoriDampak(tmpl.id),
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setKategoriDampak(kategoriRes.data || []);

                // Get klasifikasi dampak for matrix structure
                const klasifikasiRes = await axios.get(
                    API_ENDPOINTS.getPetaKlasifikasiDampak(tmpl.id),
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Build jenis kriteria list from existing data
                const existingJenis = new Set();
                const matrix = {};

                (klasifikasiRes.data || []).forEach(item => {
                    if (item.jenis_kriteria) {
                        existingJenis.add(item.jenis_kriteria);
                    }
                    const key = `${item.key}_${item.jenis_kriteria || 'default'}`;
                    matrix[key] = item;
                });

                setJenisKriteriaList(Array.from(existingJenis).length > 0
                    ? Array.from(existingJenis)
                    : ['Beban Keuangan Negara']);
                setMatrixData(matrix);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast('error', 'Gagal memuat data');
        } finally {
            setLoading(false);
        }
    }, [idInstansi, idIndukUnitKerja, tahunId, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Initialize default kategori if empty
    useEffect(() => {
        if (kategoriDampak.length === 0 && template) {
            const defaultKategori = [
                { key: 1, nama: 'Tidak Signifikan' },
                { key: 2, nama: 'Minor' },
                { key: 3, nama: 'Moderat' },
                { key: 4, nama: 'Signifikan' },
                { key: 5, nama: 'Sangat Signifikan' }
            ];
            setKategoriDampak(defaultKategori);
        }
    }, [kategoriDampak, template]);

    // Handle add jenis kriteria (new row)
    const handleAddJenisKriteria = () => {
        if (!newJenisKriteria.trim()) {
            showToast('warning', 'Masukkan nama jenis kriteria');
            return;
        }
        if (jenisKriteriaList.includes(newJenisKriteria)) {
            showToast('warning', 'Jenis kriteria sudah ada');
            return;
        }
        setJenisKriteriaList([...jenisKriteriaList, newJenisKriteria]);
        setNewJenisKriteria('');
        showToast('success', 'Jenis kriteria ditambahkan');
    };

    // Handle remove jenis kriteria
    const handleRemoveJenisKriteria = (jenis) => {
        if (jenisKriteriaList.length <= 1) {
            showToast('warning', 'Minimal harus ada 1 jenis kriteria');
            return;
        }
        setJenisKriteriaList(jenisKriteriaList.filter(j => j !== jenis));
        showToast('success', 'Jenis kriteria dihapus');
    };

    // Modal A: Edit Kategori
    const openKategoriModal = (kategori) => {
        setKategoriForm({ key: kategori.key, nama: kategori.nama || '' });
        setShowKategoriModal(true);
    };

    const saveKategori = async () => {
        try {
            // Update local state
            setKategoriDampak(kategoriDampak.map(k =>
                k.key === kategoriForm.key ? { ...k, nama: kategoriForm.nama } : k
            ));
            setShowKategoriModal(false);
            showToast('success', 'Kategori berhasil disimpan');
        } catch (err) {
            showToast('error', 'Gagal menyimpan kategori');
        }
    };

    // Modal B: Edit Penjelasan
    const openPenjelasanModal = (kategori) => {
        setPenjelasanForm({
            id: kategori.key,
            nama: kategori.nama,
            penjelasan: kategori.penjelasan || ''
        });
        setShowPenjelasanModal(true);
    };

    const savePenjelasan = async () => {
        try {
            setKategoriDampak(kategoriDampak.map(k =>
                k.key === penjelasanForm.id ? { ...k, penjelasan: penjelasanForm.penjelasan } : k
            ));
            setShowPenjelasanModal(false);
            showToast('success', 'Penjelasan berhasil disimpan');
        } catch (err) {
            showToast('error', 'Gagal menyimpan penjelasan');
        }
    };

    // Modal C: Edit Kriteria
    const openKriteriaModal = (kategori, jenisKriteria) => {
        const key = `${kategori.key}_${jenisKriteria}`;
        const existingData = matrixData[key] || {};

        setKriteriaForm({
            kategori_key: kategori.key,
            jenis_kriteria: jenisKriteria,
            kategori_nama: kategori.nama,
            kriteria: existingData.value || '',
            formula: existingData.formula || ''
        });
        setShowKriteriaModal(true);
    };

    const saveKriteria = async () => {
        try {
            const key = `${kriteriaForm.kategori_key}_${kriteriaForm.jenis_kriteria}`;
            setMatrixData({
                ...matrixData,
                [key]: {
                    key: kriteriaForm.kategori_key,
                    jenis_kriteria: kriteriaForm.jenis_kriteria,
                    value: kriteriaForm.kriteria,
                    formula: kriteriaForm.formula
                }
            });
            setShowKriteriaModal(false);
            showToast('success', 'Kriteria berhasil disimpan');
        } catch (err) {
            showToast('error', 'Gagal menyimpan kriteria');
        }
    };

    // Save all data to backend
    const handleSaveAll = async () => {
        try {
            setLoading(true);

            // Save kategori dampak
            for (const kategori of kategoriDampak) {
                await axios.post(
                    API_ENDPOINTS.postPetaKategori(template?.id),
                    {
                        key: kategori.key,
                        nama: kategori.nama,
                        jenis: 'DAMPAK',
                        penjelasan: kategori.penjelasan
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            // Save klasifikasi/kriteria
            for (const [key, data] of Object.entries(matrixData)) {
                await axios.post(
                    API_ENDPOINTS.postPetaKlasifikasi(template?.id),
                    {
                        key: data.key,
                        value: data.value,
                        jenis: 'DAMPAK',
                        jenis_kriteria: data.jenis_kriteria,
                        formula: data.formula
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            showToast('success', 'Semua data berhasil disimpan');
        } catch (err) {
            console.error('Error saving:', err);
            showToast('error', 'Gagal menyimpan data');
        } finally {
            setLoading(false);
        }
    };

    // Get cell data
    const getCellData = (kategoriKey, jenisKriteria) => {
        const key = `${kategoriKey}_${jenisKriteria}`;
        return matrixData[key] || {};
    };

    return (
        <>
            <PageHeader title="Pengisian Kategori dan Kriteria Dampak Risiko" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Pengisian Kategori dan Kriteria Dampak Risiko</h4>
                            <p className="text-muted mb-0">
                                Pilih skala dampak dan atur kategori, penjelasan, serta kriteria untuk setiap level
                            </p>
                        </div>
                        <Button variant="primary" onClick={handleSaveAll} disabled={loading}>
                            <FiSave className="me-2" />
                            {loading ? 'Menyimpan...' : 'Simpan Semua'}
                        </Button>
                    </div>

                    {!idIndukUnitKerja && (
                        <div className="alert alert-warning">
                            Silakan pilih Induk Unit Kerja terlebih dahulu
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" />
                        </div>
                    ) : (
                        <>
                            {/* Matrix Table */}
                            <div className="table-responsive">
                                <Table bordered className="text-center align-middle">
                                    <thead>
                                        <tr>
                                            <th rowSpan="2" className="bg-light" style={{ width: '200px' }}>
                                                Peta Dampak
                                            </th>
                                            <th colSpan={kategoriDampak.length} className="bg-light">
                                                Kategori Dampak
                                            </th>
                                        </tr>
                                        <tr>
                                            {kategoriDampak.map((k) => (
                                                <th key={k.key} className="bg-light">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <span>{k.nama || `Level ${k.key}`}</span>
                                                        <small className="text-muted">({k.key})</small>
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => openKategoriModal(k)}
                                                            className="mt-1"
                                                        >
                                                            <FiEdit2 size={14} />
                                                        </Button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jenisKriteriaList.map((jenis, rowIndex) => (
                                            <tr key={jenis}>
                                                <td className="bg-light text-start">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span>{jenis}</span>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleRemoveJenisKriteria(jenis)}
                                                        >
                                                            <FiMinus />
                                                        </Button>
                                                    </div>
                                                </td>
                                                {kategoriDampak.map((kategori) => {
                                                    const cellData = getCellData(kategori.key, jenis);
                                                    return (
                                                        <td
                                                            key={`${kategori.key}_${jenis}`}
                                                            style={{
                                                                backgroundColor: '#33cc00',
                                                                color: 'white',
                                                                minWidth: '150px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem'
                                                            }}
                                                            onClick={() => openKriteriaModal(kategori, jenis)}
                                                        >
                                                            <div className="p-2">
                                                                <strong>{kategori.nama}</strong>
                                                                {cellData.value && (
                                                                    <div className="mt-1 small">
                                                                        {cellData.value}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Add Jenis Kriteria */}
                            <div className="mt-4 p-3 border rounded">
                                <h6>Tambah Jenis Kriteria Baru</h6>
                                <div className="d-flex gap-2">
                                    <Form.Control
                                        type="text"
                                        placeholder="Nama jenis kriteria..."
                                        value={newJenisKriteria}
                                        onChange={(e) => setNewJenisKriteria(e.target.value)}
                                    />
                                    <Button variant="success" onClick={handleAddJenisKriteria}>
                                        <FiPlus className="me-1" /> Tambah
                                    </Button>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-4">
                                <h6>Cara Pengisian:</h6>
                                <ol className="small">
                                    <li><strong>A. Mengisi Level/Kategori:</strong> Klik ikon edit pada header kolom untuk mengisi nama kategori</li>
                                    <li><strong>B. Mengisi Penjelasan:</strong> Klik pada sel untuk mengisi penjelasan kategori</li>
                                    <li><strong>C. Mengisi Kriteria:</strong> Klik pada sel hijau untuk mengisi detail kriteria</li>
                                    <li>Gunakan tombol <FiPlus /> untuk menambah jenis kriteria baru</li>
                                    <li>Gunakan tombol <FiMinus /> untuk menghapus jenis kriteria</li>
                                </ol>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <Footer />

            {/* Modal A: Edit Kategori */}
            <Modal show={showKategoriModal} onHide={() => setShowKategoriModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>A. Mengisi Level/Kategori</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Level</Form.Label>
                            <Form.Control type="text" value={kategoriForm.key} disabled />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Kategori *</Form.Label>
                            <Form.Control
                                type="text"
                                value={kategoriForm.nama}
                                onChange={(e) => setKategoriForm({...kategoriForm, nama: e.target.value})}
                                placeholder="Contoh: Tidak Signifikan"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-danger" onClick={() => setShowKategoriModal(false)}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={saveKategori}>
                        <FiSave className="me-1" /> Simpan
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal B: Edit Penjelasan */}
            <Modal show={showPenjelasanModal} onHide={() => setShowPenjelasanModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>B. Mengisi Penjelasan</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Kategori</Form.Label>
                            <Form.Control type="text" value={penjelasanForm.nama} disabled />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Penjelasan</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={penjelasanForm.penjelasan}
                                onChange={(e) => setPenjelasanForm({...penjelasanForm, penjelasan: e.target.value})}
                                placeholder="Masukkan penjelasan..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-danger" onClick={() => setShowPenjelasanModal(false)}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={savePenjelasan}>
                        <FiSave className="me-1" /> Simpan
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal C: Edit Kriteria */}
            <Modal show={showKriteriaModal} onHide={() => setShowKriteriaModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>C. Mengisi Kriteria</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Kategori</Form.Label>
                            <Form.Control type="text" value={kriteriaForm.kategori_nama} disabled />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Jenis Kriteria</Form.Label>
                            <Form.Control type="text" value={kriteriaForm.jenis_kriteria} disabled />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kriteria / Formula</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                value={kriteriaForm.kriteria}
                                onChange={(e) => setKriteriaForm({...kriteriaForm, kriteria: e.target.value})}
                                placeholder="Contoh: ≤0,01% dari total anggaran..."
                            />
                        </Form.Group>
                    </Form>
                    <div className="alert alert-info">
                        <small>
                            <strong>Contoh:</strong> Kategori x Penjelasan = Kriteria<br/>
                            Misal: Signifikan (4) x Beban Keuangan Negara = ≤1% dari total anggaran
                        </small>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-danger" onClick={() => setShowKriteriaModal(false)}>
                        Batal
                    </Button>
                    <Button variant="primary" onClick={saveKriteria}>
                        <FiSave className="me-1" /> Simpan
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default KriteriaRisikoDampakMatrix;
