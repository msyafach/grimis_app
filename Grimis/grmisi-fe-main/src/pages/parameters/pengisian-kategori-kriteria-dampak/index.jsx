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
    const [showAddJenisModal, setShowAddJenisModal] = useState(false);
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
            let templateRes;
            try {
                templateRes = await axios.get(
                    API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahunId, idIndukUnitKerja),
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (templateErr) {
                // Template might not exist, we'll generate one
                console.log('Template not found, will generate one');
                templateRes = { data: [] };
            }

            let tmpl;
            if (templateRes.data && templateRes.data.length > 0) {
                tmpl = templateRes.data[0];
                setTemplate(tmpl);
            } else {
                // Generate template automatically
                try {
                    const generateRes = await axios.post(
                        API_ENDPOINTS.postPetaTemplate(tahunId, idInstansi, idIndukUnitKerja),
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    tmpl = generateRes.data;
                    setTemplate(tmpl);
                    showToast('success', 'Template baru berhasil dibuat');
                } catch (genErr) {
                    console.error('Failed to generate template:', genErr);
                    showToast('error', 'Gagal membuat template. Silakan buat template di menu Setting Matriks Risiko terlebih dahulu.');
                    setLoading(false);
                    return;
                }
            }

            // Get kategori dampak - use sync if needed
            let kategoriRes;
            try {
                kategoriRes = await axios.get(
                    API_ENDPOINTS.getPetaKategoriDampak(tmpl.id),
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (kategoriErr) {
                console.log('No kategori found, using defaults');
                kategoriRes = { data: [] };
            }

            if (kategoriRes.data && kategoriRes.data.length > 0) {
                setKategoriDampak(kategoriRes.data);
            } else {
                // Use default kategori
                setKategoriDampak([
                    { key: 1, nama: 'Tidak Signifikan' },
                    { key: 2, nama: 'Minor' },
                    { key: 3, nama: 'Moderat' },
                    { key: 4, nama: 'Signifikan' },
                    { key: 5, nama: 'Sangat Signifikan' }
                ]);
            }

            // Get klasifikasi dampak for matrix structure
            let klasifikasiRes;
            try {
                klasifikasiRes = await axios.get(
                    API_ENDPOINTS.getPetaKlasifikasiDampak(tmpl.id),
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (klasifikasiErr) {
                console.log('No klasifikasi found');
                klasifikasiRes = { data: [] };
            }

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
        } catch (err) {
            console.error('Error fetching data:', err);
            showToast('error', 'Gagal memuat data. Pastikan Setting Matriks Risiko sudah dikonfigurasi.');
        } finally {
            setLoading(false);
        }
    }, [idInstansi, idIndukUnitKerja, tahunId, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
                            {/* Matrix Table - Fixed Layout */}
                            <div className="table-responsive">
                                <table className="table table-bordered" style={{ tableLayout: 'fixed', minWidth: '900px' }}>
                                    <thead>
                                        {/* Row 1: Main headers */}
                                        <tr style={{ height: '60px' }}>
                                            <th rowSpan="2" className="text-center align-middle bg-light" style={{ width: '100px', verticalAlign: 'middle' }}>
                                                Peta Dampak
                                            </th>
                                            <th colSpan={5} className="text-center align-middle bg-light">
                                                Kategori Dampak
                                            </th>
                                        </tr>
                                        {/* Row 2: Level numbers and category names */}
                                        <tr style={{ height: '80px' }}>
                                            {kategoriDampak.map((k) => (
                                                <th key={k.key} className="text-center align-middle bg-light" style={{ width: '180px', verticalAlign: 'middle' }}>
                                                    <div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{k.key}</div>
                                                        <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>
                                                            {k.nama || `Level ${k.key}`}
                                                            <span className="text-muted"> ({k.key})</span>
                                                        </div>
                                                        <button
                                                            className="btn btn-link btn-sm p-0 mt-1"
                                                            onClick={() => openKategoriModal(k)}
                                                            style={{ color: '#0d6efd', fontSize: '0.75rem' }}
                                                        >
                                                            <FiEdit2 size={12} /> Edit
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jenisKriteriaList.map((jenis, rowIndex) => (
                                            <tr key={jenis} style={{ minHeight: '100px' }}>
                                                {/* First cell: Penjelasan (only on first row) */}
                                                {rowIndex === 0 && (
                                                    <td rowSpan={jenisKriteriaList.length} className="text-center align-middle bg-light" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', width: '30px', fontSize: '0.85rem' }}>
                                                        Penjelasan
                                                    </td>
                                                )}
                                                {/* Second cell: Row number */}
                                                <td className="text-center align-middle bg-light" style={{ width: '40px', fontWeight: 'bold' }}>
                                                    {rowIndex + 1}
                                                </td>
                                                {/* Third cell: Jenis Kriteria name with delete button */}
                                                <td className="align-middle bg-light" style={{ width: '160px' }}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span style={{ fontWeight: '500' }}>{jenis}</span>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleRemoveJenisKriteria(jenis)}
                                                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                                        >
                                                            <FiMinus size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                                {/* Data cells: 5 columns with green background */}
                                                {kategoriDampak.map((kategori) => {
                                                    const cellData = getCellData(kategori.key, jenis);
                                                    return (
                                                        <td
                                                            key={`${kategori.key}_${jenis}`}
                                                            className="align-middle text-white"
                                                            style={{
                                                                backgroundColor: '#33cc00',
                                                                minHeight: '100px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.8rem',
                                                                padding: '10px'
                                                            }}
                                                            onClick={() => openKriteriaModal(kategori, jenis)}
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                                                    {kategori.nama || `Level ${kategori.key}`}
                                                                </div>
                                                                {cellData.value && (
                                                                    <div style={{ fontSize: '0.75rem', lineHeight: '1.3' }}>
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
                                </table>
                            </div>

                            {/* Plus/Minus buttons at bottom */}
                            <div className="d-flex justify-content-center mt-3">
                                <div className="d-flex gap-2">
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setShowAddJenisModal(true)}
                                        style={{ padding: '5px 15px' }}
                                    >
                                        <FiPlus size={18} />
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => jenisKriteriaList.length > 1 && handleRemoveJenisKriteria(jenisKriteriaList[jenisKriteriaList.length - 1])}
                                        style={{ padding: '5px 15px' }}
                                        disabled={jenisKriteriaList.length <= 1}
                                    >
                                        <FiMinus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="mt-4">
                                <h6>Cara Pengisian:</h6>
                                <ol className="small">
                                    <li><strong>A. Mengisi Level/Kategori:</strong> Klik "Edit" pada header kolom untuk mengisi nama kategori</li>
                                    <li><strong>B. Mengisi Penjelasan:</strong> Klik pada sel kiri (jenis kriteria) untuk mengisi penjelasan</li>
                                    <li><strong>C. Mengisi Kriteria:</strong> Klik pada sel hijau untuk mengisi detail kriteria/formula</li>
                                    <li>Gunakan tombol <FiPlus /> untuk menambah jenis kriteria baru</li>
                                    <li>Gunakan tombol <FiMinus /> atau ikon minus di setiap baris untuk menghapus jenis kriteria</li>
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

            {/* Modal D: Add Jenis Kriteria */}
            <Modal show={showAddJenisModal} onHide={() => setShowAddJenisModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Tambah Jenis Kriteria Baru</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nama Jenis Kriteria *</Form.Label>
                            <Form.Control
                                type="text"
                                value={newJenisKriteria}
                                onChange={(e) => setNewJenisKriteria(e.target.value)}
                                placeholder="Contoh: Beban Keuangan Negara"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-danger" onClick={() => setShowAddJenisModal(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            handleAddJenisKriteria();
                            setShowAddJenisModal(false);
                        }}
                        disabled={!newJenisKriteria.trim()}
                    >
                        <FiPlus className="me-1" /> Tambah
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default KriteriaRisikoDampakMatrix;
