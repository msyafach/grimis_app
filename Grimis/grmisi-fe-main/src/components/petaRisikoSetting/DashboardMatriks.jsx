import { useEffect, useState } from "react";
import { FiPlus, FiTrash, FiSave, FiCopy } from 'react-icons/fi';
import axios from "axios";
import {
    Card,
    Table,
    Modal,
    Button,
    Form,
} from "react-bootstrap";
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import SalinTemplateModal from "./SalinTemplateModal";
import { useAuth } from "../../context/AuthContext";

const warnaKategori = {
    1: { header: 'bg-success text-white', cell: 'bg-soft-success text-success' },
    2: { header: 'bg-success text-white', cell: 'bg-soft-success text-success' },
    3: { header: 'bg-warning text-white', cell: 'bg-soft-warning text-warning' },
    4: { header: 'bg-warning text-white', cell: 'bg-soft-warning text-warning' },
    5: { header: 'bg-danger text-white', cell: 'bg-soft-danger text-danger' },
};

const DashboardMatriks = () => {
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();
    const { user } = useAuth();
    const isAdminOrganisasi = user?.role === "ADMIN_KLP";
    const [frekuensi, setFrekuensi] = useState(1);
    const [dampak, setDampak] = useState(1);
    const [showModalSalin, setShowModalSalin] = useState(false);
    const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [klasifikasiFrekuensi, setKlasifikasiFrekuensi] = useState([]);
    const [klasifikasiDampak, setKlasifikasiDampak] = useState([]);
    const [metaFrekuensi, setMetaFrekuensi] = useState([]);
    const [metaDampak, setMetaDampak] = useState([]);
    const [metaHeatmap, setMetaHeatmap] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Unified modal state
    const [modalState, setModalState] = useState({
        type: null, // "kategori", "klasifikasi", "meta", "deleteRow", "deleteRowDampak", "heatmap"
        isOpen: false,
        editItem: null,
        inputValue: "",
        colorValue: "#ffffff",
        jenis: "FREKUENSI" // Default jenis
    });

    const token = localStorage.getItem('access_token');

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await axios.get(API_ENDPOINTS.getPetaView(tahunId, idInstansi, idIndukUnitKerja), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = res.data;
                setFrekuensi(data.template.frekuensi);
                setDampak(data.template.dampak);
                setKategoriFrekuensi([...data.kategori_frekuensi].sort((a, b) => Number(a.key) - Number(b.key)));
                setKategoriDampak([...data.kategori_dampak].sort((a, b) => Number(a.key) - Number(b.key)));
                setKlasifikasiFrekuensi(data.klasifikasi_frekuensi);
                setKlasifikasiDampak(data.klasifikasi_dampak);
                setMetaFrekuensi(data.meta_frekuensi);
                setMetaDampak(data.meta_dampak);
                setMetaHeatmap(data.meta_heatmap);
            } catch (err) {
                console.error("Gagal fetch data peta risiko:", err);
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tahunId, idInstansi, idIndukUnitKerja, token]);

    const handleTemplateUpdate = async () => {
        try {
            await axios.put(API_ENDPOINTS.putPetaTemplateById(idTemplate), {
                frekuensi: Number(frekuensi),
                dampak: Number(dampak),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Template berhasil Diperbarui!");
        } catch (err) {
            showToast("error", "Gagal menyimpan pengaturan template.");
            console.error(err);
        }
    };

    // Helper Functions
    const getMetaValue = (kategori, klasifikasi) => {
        const found = metaFrekuensi.find(
            (item) => String(item.kategori) === String(kategori) &&
                String(item.klasifikasi) === String(klasifikasi)
        );
        return found?.value || "-";
    };

    const getMetaValueDampak = (kategori, klasifikasi) => {
        const found = metaDampak.find(
            (item) => String(item.kategori) === String(kategori) &&
                String(item.klasifikasi) === String(klasifikasi)
        );
        return found?.value || "-";
    };

    // Modal handling functions
    const openModal = (type, item = null, initialValue = "", jenis = "FREKUENSI") => {
        setModalState({
            type,
            isOpen: true,
            editItem: item,
            inputValue: initialValue,
            colorValue: item?.kode_warna || "#ffffff",
            jenis
        });
    };

    const closeModal = () => {
        setModalState({
            type: null,
            isOpen: false,
            editItem: null,
            inputValue: "",
            colorValue: "#ffffff",
            jenis: "FREKUENSI"
        });
    };

    const handleInputChange = (e) => {
        setModalState({
            ...modalState,
            inputValue: e.target.value
        });
    };

    const handleColorChange = (e) => {
        setModalState({
            ...modalState,
            colorValue: e.target.value
        });
    };

    // Row Management Functions
    const handleAddRow = () => {
        const key = (klasifikasiFrekuensi.length + 1).toString();
        const newKlasifikasi = { key, value: "", jenis: "FREKUENSI" };
        setKlasifikasiFrekuensi([...klasifikasiFrekuensi, newKlasifikasi]);
    };

    const handleAddRowDampak = () => {
        const key = (klasifikasiDampak.length + 1).toString();
        const newDampak = { key, value: "", jenis: "DAMPAK" };
        setKlasifikasiDampak([...klasifikasiDampak, newDampak]);
    };

    // Open Modal Handlers
    const handleEditKategori = (item) => {
        const jenis = item.jenis || "FREKUENSI";
        openModal("kategori", item, item.value || "", jenis);
    };

    const handleEditKlasifikasi = (klasifikasi) => {
        const jenis = klasifikasi.jenis || "FREKUENSI";
        openModal("klasifikasi", klasifikasi, klasifikasi.value || "", jenis);
    };

    const handleEditMeta = (kategoriKey, klasifikasiKey, jenis = "FREKUENSI") => {
        const metaList = jenis === "DAMPAK" ? metaDampak : metaFrekuensi;
        const existing = metaList.find(
            (item) => String(item.kategori) === String(kategoriKey) &&
                String(item.klasifikasi) === String(klasifikasiKey)
        );

        const metaItem = {
            id: existing?.id || null,
            kategori: kategoriKey,
            klasifikasi: klasifikasiKey,
            jenis
        };
        openModal("meta", metaItem, existing?.value || "", jenis);
    };

    const handleEditHeatmap = (heatItem, frekuensiKey, dampakKey) => {
        const item = heatItem || {};
        openModal("heatmap", {
            ...item,
            id: item?.id || null,
            frekuensi: frekuensiKey,
            dampak: dampakKey
        }, item?.value || "")
    };

    const handleDeleteRow = (klasifikasi) => {
        openModal("deleteRow", klasifikasi, "", klasifikasi.jenis || "FREKUENSI");
    };

    const handleDeleteRowDampak = (klasifikasi) => {
        openModal("deleteRowDampak", klasifikasi, "", "DAMPAK");
    };

    // Save Functions
    const handleSaveKategori = async () => {
        if (!modalState.editItem) return;

        try {
            await axios.put(API_ENDPOINTS.putPetaKategori(modalState.editItem.id), {
                key: modalState.editItem.key,
                value: modalState.inputValue
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            // Update state based on jenis
            if (modalState.jenis === "DAMPAK") {
                setKategoriDampak((prev) =>
                    prev.map((item) =>
                        item.id === modalState.editItem.id ? { ...item, value: modalState.inputValue } : item
                    )
                );
            } else {
                setKategoriFrekuensi((prev) =>
                    prev.map((item) =>
                        item.id === modalState.editItem.id ? { ...item, value: modalState.inputValue } : item
                    )
                );
            }

            closeModal();
        } catch (err) {
            console.error("Gagal update kategori:", err);
        }
    };

    const handleSaveKlasifikasi = async () => {
        if (!modalState.editItem) return;

        const isNew = !modalState.editItem.id;
        const body = {
            key: modalState.editItem.key,
            value: modalState.inputValue,
            jenis: modalState.jenis
        };

        const endpoint = isNew
            ? API_ENDPOINTS.postPetaKlasifikasi(idTemplate)
            : API_ENDPOINTS.putPetaKlasifikasi(modalState.editItem.id);

        const method = isNew ? axios.post : axios.put;

        try {
            const res = await method(endpoint, body, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const updated = isNew
                ? { ...body, id: res.data.id }
                : { ...modalState.editItem, value: modalState.inputValue };

            // Update appropriate state based on jenis
            if (modalState.jenis === "DAMPAK") {
                setKlasifikasiDampak(prev =>
                    prev.map(item => item.key === updated.key ? updated : item)
                );
            } else {
                setKlasifikasiFrekuensi(prev =>
                    prev.map(item => item.key === updated.key ? updated : item)
                );
            }

            closeModal();
        } catch (err) {
            console.error("Gagal menyimpan klasifikasi:", err);
        }
    };

    const handleSaveMeta = async () => {
        if (!modalState.editItem) return;

        const isNew = !modalState.editItem.id;
        const body = {
            kategori: modalState.editItem.kategori,
            klasifikasi: modalState.editItem.klasifikasi,
            value: modalState.inputValue,
            jenis: modalState.jenis
        };

        const endpoint = isNew
            ? API_ENDPOINTS.postPetaMatriks(idTemplate)
            : API_ENDPOINTS.putPetaMatriks(modalState.editItem.id);

        const method = isNew ? axios.post : axios.put;

        try {
            const res = await method(endpoint, body, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const updated = isNew
                ? { ...body, id: res.data.id }
                : { ...modalState.editItem, value: modalState.inputValue };

            // Update appropriate state based on jenis
            if (modalState.jenis === "DAMPAK") {
                const updatedMeta = isNew
                    ? [...metaDampak, updated]
                    : metaDampak.map(m => m.id === modalState.editItem.id ? { ...m, value: modalState.inputValue } : m);
                setMetaDampak(updatedMeta);
            } else {
                const updatedMeta = isNew
                    ? [...metaFrekuensi, updated]
                    : metaFrekuensi.map(m => m.id === modalState.editItem.id ? { ...m, value: modalState.inputValue } : m);
                setMetaFrekuensi(updatedMeta);
            }

            closeModal();
        } catch (err) {
            console.error("Gagal simpan meta:", err);
        }
    };

    const handleSaveHeatmap = async () => {
        if (!modalState.editItem) return;

        const isNew = !modalState.editItem.id;

        const payload = {
            value: modalState.inputValue,
            kode_warna: modalState.colorValue,
            frekuensi: parseInt(modalState.editItem.frekuensi),
            dampak: parseInt(modalState.editItem.dampak),
        };

        const endpoint = isNew
            ? API_ENDPOINTS.postPetaHeatmap(idTemplate)
            : API_ENDPOINTS.putPetaHeatmap(modalState.editItem.id);

        const method = isNew ? axios.post : axios.put;

        try {
            const res = await method(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const newItem = isNew
                ? { ...payload, id: res.data.id }
                : { ...modalState.editItem, ...payload };

            setMetaHeatmap((prev) =>
                isNew
                    ? [...prev, newItem]
                    : prev.map((m) =>
                        m.id === modalState.editItem.id ? newItem : m
                    )
            );

            closeModal();
        } catch (error) {
            console.error("Gagal update heatmap:", error);
        }
    };

    const handleConfirmDeleteRow = async () => {
        if (!modalState.editItem) return;

        const isNew = !modalState.editItem.id;

        try {
            if (!isNew) {
                const relatedMeta = metaFrekuensi.filter((item) => item.klasifikasi === modalState.editItem.key);
                for (const meta of relatedMeta) {
                    await axios.delete(API_ENDPOINTS.deletePetaMatriks(meta.id), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
                await axios.delete(API_ENDPOINTS.deletePetaKlasifikasi(modalState.editItem.id), {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setKlasifikasiFrekuensi((prev) => prev.filter((item) => item.key !== modalState.editItem.key));
            setMetaFrekuensi((prev) => prev.filter((item) => item.klasifikasi !== modalState.editItem.key));
            closeModal();
        } catch (err) {
            console.error("Gagal hapus:", err);
        }
    };

    const handleConfirmDeleteRowDampak = async () => {
        if (!modalState.editItem) return;

        const isNew = !modalState.editItem.id;

        try {
            if (!isNew) {
                const relatedMeta = metaDampak.filter((item) => item.klasifikasi === modalState.editItem.key);
                for (const meta of relatedMeta) {
                    await axios.delete(API_ENDPOINTS.deletePetaMatriks(meta.id), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
                await axios.delete(API_ENDPOINTS.deletePetaKlasifikasi(modalState.editItem.id), {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setKlasifikasiDampak((prev) => prev.filter((item) => item.key !== modalState.editItem.key));
            setMetaDampak((prev) => prev.filter((item) => item.klasifikasi !== modalState.editItem.key));
            closeModal();
        } catch (err) {
            console.error("Gagal hapus:", err);
        }
    };

    // Render modal component based on current state
    const renderModal = () => {
        switch (modalState.type) {
            case 'kategori':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">
                                Edit Kategori {modalState.jenis === "DAMPAK" ? "Dampak" : "Frekuensi"}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="kategoriValue">Deskripsi Kategori</Form.Label>
                                <Form.Control
                                    id="kategoriValue"
                                    size="sm"
                                    className="rounded-3"
                                    value={modalState.inputValue}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan deskripsi kategori"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="outline-danger" onClick={closeModal}>Batal</Button>
                            <Button variant="primary" onClick={handleSaveKategori}>Simpan</Button>
                        </Modal.Footer>
                    </Modal>
                );

            case 'klasifikasi':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">
                                Isi Penjelasan Klasifikasi {modalState.jenis === "DAMPAK" ? "Dampak" : "Frekuensi"}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="editKlasifikasi">Penjelasan</Form.Label>
                                <Form.Control
                                    id="editKlasifikasi"
                                    size="sm"
                                    className="rounded-3"
                                    value={modalState.inputValue}
                                    onChange={handleInputChange}
                                    placeholder="Masukkan penjelasan klasifikasi"
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="outline-danger" onClick={closeModal}>Batal</Button>
                            <Button variant="primary" onClick={handleSaveKlasifikasi}>Simpan</Button>
                        </Modal.Footer>
                    </Modal>
                );

            case 'meta':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">
                                Isi Nilai Matriks {modalState.jenis === "DAMPAK" ? "Dampak" : "Frekuensi"}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="metaValue">Deskripsi</Form.Label>
                                <Form.Control
                                    id="metaValue"
                                    size="sm"
                                    className="rounded-3"
                                    value={modalState.inputValue}
                                    onChange={handleInputChange}
                                    placeholder={`Masukkan nilai ${modalState.jenis === "DAMPAK" ? "dampak" : "frekuensi"}`}
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="outline-danger" onClick={closeModal}>Batal</Button>
                            <Button variant="primary" onClick={handleSaveMeta}>Simpan</Button>
                        </Modal.Footer>
                    </Modal>
                );

            case 'deleteRow':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">Konfirmasi Hapus</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            Apakah kamu yakin ingin menghapus klasifikasi{" "}
                            <strong>{modalState.editItem?.value || modalState.editItem?.key}</strong> beserta semua datanya?
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeModal}>Batal</Button>
                            <Button variant="danger" onClick={handleConfirmDeleteRow}>Hapus</Button>
                        </Modal.Footer>
                    </Modal>
                );

            case 'deleteRowDampak':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">Konfirmasi Hapus</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            Apakah kamu yakin ingin menghapus klasifikasi{" "}
                            <strong>{modalState.editItem?.value || modalState.editItem?.key}</strong> beserta semua datanya?
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeModal}>Batal</Button>
                            <Button variant="danger" onClick={handleConfirmDeleteRowDampak}>Hapus</Button>
                        </Modal.Footer>
                    </Modal>
                );

            case 'heatmap':
                return (
                    <Modal show={modalState.isOpen} onHide={closeModal} centered>
                        <Modal.Header closeButton>
                            <Modal.Title className="fs-6">Edit Peta Risiko</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group className="mb-3">
                                <Form.Label htmlFor="heatmapValue">Nilai</Form.Label>
                                <Form.Control
                                    id="heatmapValue"
                                    type="number"
                                    value={modalState.inputValue}
                                    onChange={handleInputChange}
                                    placeholder="Isi nilai peta risiko"
                                />
                            </Form.Group>

                            <Form.Group>
                                <Form.Label htmlFor="heatmapColor">Warna</Form.Label>
                                <div className="d-flex align-items-center gap-2">
                                    <Form.Control
                                        id="heatmapColorPicker"
                                        size="sm"
                                        type="color"
                                        value={modalState.colorValue}
                                        onChange={handleColorChange}
                                        className="p-0 border-0 rounded-3"
                                        style={{ width: "40px", height: "40px", cursor: "pointer" }}
                                    />
                                    <Form.Control
                                        id="heatmapColorText"
                                        size="sm"
                                        className="rounded-3"
                                        type="text"
                                        value={modalState.colorValue}
                                        onChange={handleColorChange}
                                        placeholder="#rrggbb atau rgb(r,g,b)"
                                    />
                                </div>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="outline-danger" onClick={closeModal}>Batal</Button>
                            <Button variant="primary" onClick={handleSaveHeatmap}>Simpan</Button>
                        </Modal.Footer>
                    </Modal>
                );

            default:
                return null;
        }
    };

    // Render the heatmap table cells with conditional styling
    const renderHeatmapCell = (heat, f, d) => {
        const cellStyle = {
            backgroundColor: heat?.kode_warna || "#eee",
            cursor: "pointer",
            whiteSpace: "normal",
            fontWeight: 'bold'
        };
        
        return (
            <td
                key={`cell-${f.key}-${d.key}`}
                className="text-dark"
                style={cellStyle}
                onClick={() => handleEditHeatmap(heat, f.key, d.key)}
            >
                {heat?.value || "-"}
            </td>
        );
    };

    if (loading) {
        return <ContentLoaderWrapper loading={loading} error={error} />;
    }

    return (
        <>
            {/*
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white border-bottom">
                    <h5 className="mb-0">Setting Matriks Risiko</h5>
                </Card.Header>
                <Card.Body>
                    <div className="d-flex flex-column flex-md-row align-items-md-center gap-2">
                        <div>
                            <label className="form-label mb-1">Frekuensi</label>
                            <input
                                type="number"
                                min={1}
                                className="form-control form-control-sm rounded-4"
                                value={frekuensi}
                                onChange={(e) => setFrekuensi(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="form-label mb-1">Dampak</label>
                            <input
                                type="number"
                                min={1}
                                className="form-control form-control-sm rounded-4"
                                value={dampak}
                                onChange={(e) => setDampak(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-primary align-self-end"
                            type="button"
                            onClick={handleTemplateUpdate}
                        >
                            <FiSave size={16} className="me-2" />
                            Simpan
                        </button>
                        <button
                            className="btn btn-outline-secondary align-self-end"
                            type="button"
                            onClick={() => setShowModalSalin(true)}
                        >
                            <FiCopy size={16} className="me-2" />
                            Salin Template
                        </button>

                    </div>
                </Card.Body>
            </Card>
            */}

            {/* Frekuensi Card */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Skala Frekuensi</h5>
                </Card.Header>
                <Card.Body className="overflow-auto">
                    <div style={{ overflowX: 'auto' }}>
                        <Table bordered hover className="text-center align-middle" style={{ minWidth: '1000px' }}>
                            <colgroup>
                                <col style={{ width: '3%' }} /> {/* Penjelasan (vertikal) */}
                                <col style={{ width: '3%' }} /> {/* Angka */}
                                <col style={{ width: '12' }} /> {/* Deskripsi */}
                                {kategoriFrekuensi.map((_, index) => (
                                    <col key={`col-${index}`} style={{ width: `${82 / kategoriFrekuensi.length}%` }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowSpan="3" colSpan="3" className="align-middle fw-semibold">Skala Frekuensi</th>
                                    <th colSpan={kategoriFrekuensi.length} className="align-middle fw-semibold">Kategori Frekuensi</th>
                                </tr>
                                <tr>
                                    {kategoriFrekuensi.map((item) => (
                                        <th key={`k-${item.key}`} style={{ whiteSpace: "normal" }}>
                                            {item.key}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {kategoriFrekuensi.map((item) => (
                                        <th
                                            key={`v - ${item.key}`}
                                            className={`${warnaKategori[item.key]?.header} fw - semibold`}
                                            style={{ cursor: "pointer", whiteSpace: "normal" }}
                                            onClick={() => handleEditKategori(item)}
                                        >
                                            {item.value || "(klik untuk isi)"}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {klasifikasiFrekuensi.map((klasifikasi, idx) => (
                                    <tr key={klasifikasi.key}>
                                        {idx === 0 && (
                                            <td
                                                rowSpan={klasifikasiFrekuensi.length}
                                                className="align-middle fw-semibold"
                                                style={{
                                                    writingMode: "vertical-rl",
                                                    transform: "rotate(180deg)",
                                                    textAlign: "center",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                Penjelasan
                                            </td>
                                        )}
                                        <td className="fw-semibold">
                                            {klasifikasi.key}
                                        </td>

                                        <td
                                            className="fw-semibold"
                                            style={{ cursor: "pointer", whiteSpace: "normal" }}
                                            onClick={() => handleEditKlasifikasi(klasifikasi)}
                                        >
                                            {klasifikasi.value || "(klik untuk isi)"}
                                        </td>

                                        {kategoriFrekuensi.map((kategori) => (
                                            <td
                                                key={`${kategori.key} - ${klasifikasi.key}`}
                                                className={`${warnaKategori[kategori.key]?.cell} text-dark`}
                                                style={{ cursor: "pointer", whiteSpace: "normal" }}
                                                onClick={() => handleEditMeta(kategori.key, klasifikasi.key, "FREKUENSI")}
                                            >
                                                {getMetaValue(kategori.key, klasifikasi.key) || "(klik untuk isi)"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    <div className="d-flex justify-content-center gap-2 mt-3 mb-2">
                        <Button variant="primary" onClick={handleAddRow}>
                            <FiPlus size={16} />
                        </Button>
                        <Button
                            variant="outline-danger text-danger"
                            disabled={klasifikasiFrekuensi.length === 0}
                            onClick={() => handleDeleteRow(klasifikasiFrekuensi[klasifikasiFrekuensi.length - 1])}
                        >
                            <FiTrash size={16} />
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Dampak Card */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Skala Dampak</h5>
                </Card.Header>
                <Card.Body className="overflow-auto">
                    <div style={{ overflowX: 'auto' }}>
                        <Table bordered hover className="text-center align-middle" style={{ minWidth: '1000px' }}>
                            <colgroup>
                                <col style={{ width: '3%' }} /> {/* Penjelasan */}
                                <col style={{ width: '3%' }} /> {/* Angka */}
                                <col style={{ width: '12%' }} /> {/* Deskripsi */}
                                {kategoriDampak.map((_, index) => (
                                    <col key={`col-${index}`} style={{ width: `${82 / kategoriDampak.length}%` }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowSpan="3" colSpan="3" className="align-middle fw-semibold">Skala Dampak</th>
                                    <th colSpan={kategoriDampak.length} className="align-middle fw-semibold">Kategori Dampak</th>
                                </tr>
                                <tr>
                                    {kategoriDampak.map((item) => (
                                        <th key={`k-${item.key}`} style={{ whiteSpace: "normal" }}>{item.key}</th>
                                    ))}
                                </tr>
                                <tr>
                                    {kategoriDampak.map((item) => (
                                        <th
                                            key={`v-${item.key}`}
                                            className={`${warnaKategori[item.key]?.header} fw-semibold`}
                                            style={{ cursor: "pointer", whiteSpace: "normal" }}
                                            onClick={() => handleEditKategori({ ...item, jenis: "DAMPAK" })}
                                        >
                                            {item.value || "(klik untuk isi)"}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {klasifikasiDampak.map((klasifikasi, idx) => (
                                    <tr key={klasifikasi.key}>
                                        {idx === 0 && (
                                            <td
                                                rowSpan={klasifikasiDampak.length}
                                                className="align-middle fw-semibold"
                                                style={{
                                                    writingMode: "vertical-rl",
                                                    transform: "rotate(180deg)",
                                                    textAlign: "center",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                Penjelasan
                                            </td>
                                        )}
                                        <td className="fw-semibold">{klasifikasi.key}</td>
                                        <td
                                            className="fw-semibold"
                                            style={{ cursor: "pointer", whiteSpace: "normal" }}
                                            onClick={() => handleEditKlasifikasi({ ...klasifikasi, jenis: "DAMPAK" })}
                                        >
                                            {klasifikasi.value || "(klik untuk isi)"}
                                        </td>
                                        {kategoriDampak.map((kategori) => (
                                            <td
                                                key={`${kategori.key}-${klasifikasi.key}`}
                                                className={`${warnaKategori[kategori.key]?.cell} text-dark`}
                                                style={{ cursor: "pointer", whiteSpace: "normal" }}
                                                onClick={() => handleEditMeta(kategori.key, klasifikasi.key, "DAMPAK")}
                                            >
                                                {getMetaValueDampak(kategori.key, klasifikasi.key) || "(klik untuk isi)"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    <div className="d-flex justify-content-center gap-2 mt-3 mb-2">
                        <Button variant="primary" onClick={handleAddRowDampak}>
                            <FiPlus size={16} />
                        </Button>
                        <Button
                            variant="outline-danger text-danger"
                            disabled={klasifikasiDampak.length === 0}
                            onClick={() => handleDeleteRowDampak(klasifikasiDampak[klasifikasiDampak.length - 1])}
                        >
                            <FiTrash size={16} />
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Peta Risiko Card */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Peta Risiko</h5>
                </Card.Header>
                <Card.Body className="overflow-auto">
                    <div style={{ overflowX: 'auto' }}>
                        <Table bordered hover className="text-center align-middle" style={{ minWidth: '1000px' }}>
                            <colgroup>
                                <col style={{ width: '3%' }} /> {/* Frekuensi */}
                                <col style={{ width: '3%' }} /> {/* Key */}
                                <col style={{ width: '12%' }} /> {/* Value */}
                                {kategoriDampak.map((_, index) => (
                                    <col key={`col-${index}`} style={{ width: `${82 / kategoriDampak.length}%` }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th rowSpan="3" colSpan="3" className="align-middle fw-semibold">Peta Risiko</th>
                                    <th colSpan={kategoriDampak.length} className="align-middle fw-semibold">Dampak</th>
                                </tr>
                                <tr>
                                    {kategoriDampak.map((item) => (
                                        <th key={`k-${item.key}`} style={{ whiteSpace: "normal" }}>{item.key}</th>
                                    ))}
                                </tr>
                                <tr>
                                    {kategoriDampak.map((d) => (
                                        <th key={`d-key-${d.key}`} className="fw-semibold" style={{ whiteSpace: "normal" }}>
                                            {d.value}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {kategoriFrekuensi.slice().reverse().map((f, index) => (
                                    <tr key={f.key}>
                                        {index === 0 && (
                                            <td
                                                rowSpan={kategoriFrekuensi.length}
                                                className="align-middle fw-semibold"
                                                style={{
                                                    writingMode: "vertical-rl",
                                                    transform: "rotate(180deg)",
                                                    textAlign: "center",
                                                    whiteSpace: "nowrap"
                                                }}
                                            >
                                                Frekuensi
                                            </td>
                                        )}
                                        <td className="fw-semibold">{f.key}</td>
                                        <td className="fw-semibold">{f.value}</td>
                                        {kategoriDampak.map((d) => {
                                            const heat = metaHeatmap.find(
                                                (m) => String(m.frekuensi) === String(f.key) && String(m.dampak) === String(d.key)
                                            );
                                            return renderHeatmapCell(heat, f, d);
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
            {renderModal()}

            <SalinTemplateModal
                show={showModalSalin}
                onClose={() => setShowModalSalin(false)}
            />
        </>
    );
};

export default DashboardMatriks;