import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';
import { useAuth } from '@/context/AuthContext';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { showToast } from '@/utils/toast';

const PemilihanWarnaMatriks = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);
    const [kriteriaKemungkinan, setKriteriaKemungkinan] = useState([]);
    const [kriteriaDampak, setKriteriaDampak] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showColorModal, setShowColorModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#33cc00');
    const [tahun, setTahun] = useState(new Date().getFullYear());

    const { user } = useAuth();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_KLP';

    // Predefined colors for risk levels
    const predefinedColors = [
        '#33cc00', // Green (low risk)
        '#f5a623', // Orange (medium risk)
        '#D0021B', // Red (high risk)
        '#FFD700', // Gold
        '#FF8C00', // Dark Orange
        '#4169E1', // Royal Blue
        '#8A2BE2', // Blue Violet
        '#FF1493', // Deep Pink
        '#00CED1', // Dark Turquoise
        '#FF6347', // Tomato
    ];

    // Fetch templates for the current year and unit
    const fetchTemplates = async () => {
        if (!idIndukUnitKerja || !tahun) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(
                API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahun, idIndukUnitKerjaId),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data && response.data.length > 0) {
                setTemplates(response.data);
                // Auto-select first template
                setSelectedTemplate(response.data[0]);
                fetchHeatmapData(response.data[0].id);
            } else {
                // Generate template if none exists
                generateTemplate();
            }
        } catch (err) {
            console.error('Error fetching templates:', err);
            showToast('error', 'Gagal memuat template peta risiko');
        } finally {
            setLoading(false);
        }
    };

    // Generate new template
    const generateTemplate = async () => {
        if (!idInstansi || !idIndukUnitKerja) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.post(
                API_ENDPOINTS.postPetaTemplate(tahun, idInstansi, idIndukUnitKerja),
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data) {
                setSelectedTemplate(response.data);
                fetchHeatmapData(response.data.id);
                showToast('success', 'Template berhasil dibuat');
            }
        } catch (err) {
            console.error('Error generating template:', err);
            showToast('error', 'Gagal membuat template');
        } finally {
            setLoading(false);
        }
    };

    // Fetch heatmap data for selected template
    const fetchHeatmapData = async (templateId) => {
        if (!templateId) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            // Fetch heatmap
            const heatmapResponse = await axios.get(
                API_ENDPOINTS.getPetaHeatmapTahun(templateId, tahun),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Fetch kriteria kemungkinan
            const kemungkinanResponse = await axios.get(
                API_ENDPOINTS.getKriteriaRisikoKemungkinanByTemplate(idInstansi, idIndukUnitKerja, templateId),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Fetch kriteria dampak
            const dampakResponse = await axios.get(
                API_ENDPOINTS.getKriteriaRisikoDampakByTemplate(idInstansi, idIndukUnitKerja, templateId),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setHeatmapData(heatmapResponse.data || []);
            setKriteriaKemungkinan(kemungkinanResponse.data || []);
            setKriteriaDampak(dampakResponse.data || []);
        } catch (err) {
            console.error('Error fetching heatmap data:', err);
            showToast('error', 'Gagal memuat data heatmap');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (idIndukUnitKerja && tahun) {
            fetchTemplates();
        }
    }, [idIndukUnitKerja, tahun]);

    // Handle cell click to open color picker
    const handleCellClick = (cell) => {
        if (!isAdmin) {
            showToast('warning', 'Hanya admin yang dapat mengubah warna matriks');
            return;
        }
        setSelectedCell(cell);
        setSelectedColor(cell.warna || getDefaultColor(cell.nilai_risiko));
        setShowColorModal(true);
    };

    // Get default color based on risk value
    const getDefaultColor = (value) => {
        if (value <= 15) return '#33cc00'; // Green
        if (value <= 20) return '#f5a623'; // Orange
        return '#D0021B'; // Red
    };

    // Save color change
    const handleSaveColor = async () => {
        if (!selectedCell) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            await axios.put(
                API_ENDPOINTS.putPetaHeatmap(selectedCell.id),
                { warna: selectedColor },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh heatmap data
            fetchHeatmapData(selectedTemplate.id);
            setShowColorModal(false);
            showToast('success', 'Warna berhasil diperbarui');
        } catch (err) {
            console.error('Error saving color:', err);
            showToast('error', 'Gagal menyimpan warna');
        } finally {
            setLoading(false);
        }
    };

    // Save template
    const handleSaveTemplate = async () => {
        if (!selectedTemplate) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');

            await axios.put(
                API_ENDPOINTS.putPetaTemplateById(selectedTemplate.id),
                {
                    kode: selectedTemplate.kode,
                    nama: selectedTemplate.nama,
                    frekuensi: selectedTemplate.frekuensi,
                    dampak: selectedTemplate.dampak
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            showToast('success', 'Template berhasil disimpan');
        } catch (err) {
            console.error('Error saving template:', err);
            showToast('error', 'Gagal menyimpan template');
        } finally {
            setLoading(false);
        }
    };

    // Build matrix grid from heatmap data
    const buildMatrixGrid = () => {
        if (!heatmapData.length || !kriteriaKemungkinan.length || !kriteriaDampak.length) {
            return null;
        }

        const grid = [];
        const frekuensiLevels = [...kriteriaKemungkinan].sort((a, b) => b.nilai - a.nilai); // Descending
        const dampakLevels = [...kriteriaDampak].sort((a, b) => a.nilai - b.nilai); // Ascending

        // Header row
        const headerRow = [
            { type: 'header', content: 'Peta Risiko', colSpan: 1, rowSpan: 1 },
            { type: 'header', content: 'Dampak', colSpan: dampakLevels.length, rowSpan: 1 }
        ];
        grid.push(headerRow);

        // Sub-header row with dampak levels
        const dampakHeaderRow = [
            { type: 'empty', content: '' },
            ...dampakLevels.map(d => ({
                type: 'subheader',
                content: d.nama,
                nilai: d.nilai
            }))
        ];
        grid.push(dampakHeaderRow);

        // Data rows
        frekuensiLevels.forEach((freq, rowIndex) => {
            const row = [
                {
                    type: 'rowheader',
                    content: freq.nama,
                    nilai: freq.nilai
                }
            ];

            dampakLevels.forEach((dampak) => {
                const cell = heatmapData.find(
                    h => h.frekuensi === freq.nilai && h.dampak === dampak.nilai
                );

                row.push({
                    type: 'cell',
                    data: cell,
                    nilai_risiko: cell?.nilai_risiko || (freq.nilai * dampak.nilai),
                    warna: cell?.warna || getDefaultColor(freq.nilai * dampak.nilai)
                });
            });

            grid.push(row);
        });

        return grid;
    };

    const matrixGrid = buildMatrixGrid();

    // Render color picker modal
    const renderColorModal = () => {
        if (!showColorModal || !selectedCell) return null;

        return (
            <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Pilih Warna Matriks</h5>
                            <button type="button" className="btn-close" onClick={() => setShowColorModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            <div className="mb-3">
                                <p><strong>Nilai Risiko:</strong> {selectedCell.nilai_risiko}</p>
                                <p><strong>Dampak x Frekuensi:</strong> {selectedCell.dampak} x {selectedCell.frekuensi}</p>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Pilih Warna</label>
                                <div className="d-flex flex-wrap gap-2 mb-3">
                                    {predefinedColors.map((color) => (
                                        <button
                                            key={color}
                                            className="btn p-3 border"
                                            style={{
                                                backgroundColor: color,
                                                width: '50px',
                                                height: '50px',
                                                border: selectedColor === color ? '3px solid #000' : '1px solid #ddd'
                                            }}
                                            onClick={() => setSelectedColor(color)}
                                        />
                                    ))}
                                </div>
                                <input
                                    type="color"
                                    className="form-control form-control-color w-100"
                                    value={selectedColor}
                                    onChange={(e) => setSelectedColor(e.target.value)}
                                    title="Pilih warna custom"
                                />
                            </div>

                            <div className="alert alert-info">
                                <strong>Preview:</strong>
                                <div
                                    className="mt-2 p-3 text-center text-white"
                                    style={{
                                        backgroundColor: selectedColor,
                                        borderRadius: '4px',
                                        minHeight: '60px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    {selectedCell.nilai_risiko}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowColorModal(false)}>
                                Batal
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveColor} disabled={loading}>
                                {loading ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <PageHeader title="Pemilihan Warna Matriks Risiko" />
            <div className="main-content">
                <div className="card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h4 className="mb-1">Pemilihan Warna Matriks Risiko</h4>
                            <p className="text-muted mb-0">
                                Atur warna untuk setiap level risiko pada matriks peta risiko
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <select
                                className="form-select"
                                value={tahun}
                                onChange={(e) => setTahun(parseInt(e.target.value))}
                                style={{ width: '120px' }}
                            >
                                {[...Array(5)].map((_, i) => {
                                    const year = new Date().getFullYear() - 2 + i;
                                    return <option key={year} value={year}>{year}</option>;
                                })}
                            </select>
                            {isAdmin && selectedTemplate && (
                                <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={loading}>
                                    <i className="fas fa-save me-2"></i>
                                    Simpan Template
                                </button>
                            )}
                        </div>
                    </div>

                    {!idIndukUnitKerja && (
                        <div className="alert alert-warning" role="alert">
                            Silakan pilih Induk Unit Kerja terlebih dahulu
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : matrixGrid ? (
                        <div className="table-responsive">
                            <table className="table table-bordered text-center">
                                <tbody>
                                    {matrixGrid.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => {
                                                if (cell.type === 'header') {
                                                    return (
                                                        <th
                                                            key={cellIndex}
                                                            colSpan={cell.colSpan}
                                                            className="bg-light align-middle"
                                                        >
                                                            {cell.content}
                                                        </th>
                                                    );
                                                }
                                                if (cell.type === 'empty') {
                                                    return <td key={cellIndex} className="bg-light"></td>;
                                                }
                                                if (cell.type === 'subheader') {
                                                    return (
                                                        <th key={cellIndex} className="bg-light align-middle">
                                                            <small>{cell.content}</small>
                                                            <br />
                                                            <small className="text-muted">({cell.nilai})</small>
                                                        </th>
                                                    );
                                                }
                                                if (cell.type === 'rowheader') {
                                                    return (
                                                        <th key={cellIndex} className="bg-light align-middle">
                                                            <small>{cell.content}</small>
                                                            <br />
                                                            <small className="text-muted">({cell.nilai})</small>
                                                        </th>
                                                    );
                                                }
                                                if (cell.type === 'cell') {
                                                    return (
                                                        <td
                                                            key={cellIndex}
                                                            className={`align-middle ${isAdmin ? 'cursor-pointer' : ''}`}
                                                            style={{
                                                                backgroundColor: cell.warna,
                                                                color: '#fff',
                                                                fontWeight: 'bold',
                                                                fontSize: '1.1rem',
                                                                minWidth: '80px',
                                                                height: '60px',
                                                                cursor: isAdmin ? 'pointer' : 'default'
                                                            }}
                                                            onClick={() => cell.data && handleCellClick(cell.data)}
                                                        >
                                                            {cell.nilai_risiko}
                                                        </td>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="mt-4">
                                <h6>Keterangan:</h6>
                                <div className="d-flex gap-3 flex-wrap">
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '20px', height: '20px', backgroundColor: '#33cc00', borderRadius: '4px' }}></div>
                                        <small>Rendah (1-15)</small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '20px', height: '20px', backgroundColor: '#f5a623', borderRadius: '4px' }}></div>
                                        <small>Sedang (16-20)</small>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div style={{ width: '20px', height: '20px', backgroundColor: '#D0021B', borderRadius: '4px' }}></div>
                                        <small>Tinggi (21-25)</small>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <p className="text-muted mt-2">
                                        <small>* Klik pada sel matriks untuk mengubah warnanya</small>
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <p className="text-muted">Tidak ada data matriks risiko</p>
                            {isAdmin && idIndukUnitKerja && (
                                <button className="btn btn-primary" onClick={generateTemplate}>
                                    <i className="fas fa-plus me-2"></i>
                                    Buat Template Baru
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
            {renderColorModal()}
        </>
    );
};

export default PemilihanWarnaMatriks;
