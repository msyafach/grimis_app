import React, { useEffect, useState } from "react";
import { FiPlus, FiTrash } from 'react-icons/fi';
import axios from "axios";
import {
    Card, CardBody, CardHeader, Table, Spinner, Modal,
    ModalHeader, ModalBody, ModalFooter, Input, FormGroup, Label
} from "reactstrap";
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { useInstansi } from '../../context/InstansiContext';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';

const DashboardMatriks = () => {
    const [template, setTemplate] = useState({});
    const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [klasifikasiFrekuensi, setKlasifikasiFrekuensi] = useState([]);
    const [klasifikasiDampak, setKlasifikasiDampak] = useState([]);
    const [metaFrekuensi, setMetaFrekuensi] = useState([]);
    const [metaDampak, setMetaDampak] = useState([]);

    const [editKategori, setEditKategori] = useState(null);
    const [kategoriValue, setKategoriValue] = useState("");
    const [modalKategoriOpen, setModalKategoriOpen] = useState(false);


    const [editKlasifikasi, setEditKlasifikasi] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [modalKlasifikasiOpen, setModalKlasifikasiOpen] = useState(false);

    const [metaEdit, setMetaEdit] = useState(null);
    const [metaValue, setMetaValue] = useState("");
    const [modalMetaOpen, setModalMetaOpen] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);

    const [metaHeatmap, setMetaHeatmap] = useState([]);
    const [selectedHeatmap, setSelectedHeatmap] = useState(null);
    const [heatmapValue, setHeatmapValue] = useState("");
    const [heatmapColor, setHeatmapColor] = useState("#ffffff")

    const [loading, setLoading] = useState(true);
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();

    // Inject Dynamic Contexts
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();

    if (isRemoved) return null;

    const token = localStorage.getItem('access_token');

    useEffect(() => {
        if (!idInstansi || !tahunId || !idIndukUnitKerja) return;

        axios.get(API_ENDPOINTS.getPetaView(tahunId, idInstansi, idIndukUnitKerja), {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }).then((res) => {
            const data = res.data;
            setTemplate(data.template);
            setKategoriFrekuensi(data.kategori_frekuensi);
            setKategoriFrekuensi(data.kategori_frekuensi.sort((a, b) => Number(a.key) - Number(b.key)));
            setKategoriDampak(data.kategori_dampak.sort((a, b) => Number(a.key) - Number(b.key)));
            setKlasifikasiFrekuensi(data.klasifikasi_frekuensi);
            setKlasifikasiDampak(data.klasifikasi_dampak);
            setMetaFrekuensi(data.meta_frekuensi);
            setMetaDampak(data.meta_dampak);
            setMetaHeatmap(data.meta_heatmap);
            setLoading(false);
        }).catch((err) => {
            console.error("Gagal fetch data peta risiko:", err);
            setLoading(false);
        });
    }, []);

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

    const handleAddRow = () => {
        const key = (klasifikasiFrekuensi.length + 1).toString();
        const newKlasifikasi = { key, value: "", jenis: "FREKUENSI" };
        setKlasifikasiFrekuensi([...klasifikasiFrekuensi, newKlasifikasi]);
    };

    const handleEditKategori = (item) => {
        setEditKategori(item);
        setKategoriValue(item.value || "");
        setModalKategoriOpen(true);
    };

    const handleSaveKategori = () => {
        if (!editKategori) return;

        axios.put(`${apiBaseUrl}/api/v1/peta-risiko/kategori/${editKategori.id}`, {
            key: editKategori.key,
            value: kategoriValue
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })
            .then(() => {
                setKategoriFrekuensi((prev) =>
                    prev.map((item) =>
                        item.id === editKategori.id ? { ...item, value: kategoriValue } : item
                    )
                );
                setModalKategoriOpen(false);
                setEditKategori(null);
                setKategoriValue("");
            })
            .catch((err) => {
                console.error("Gagal update kategori:", err);
            });
    };


    const handleEditClick = (klasifikasi) => {
        setEditKlasifikasi(klasifikasi);
        setEditValue(klasifikasi.value);
        setModalKlasifikasiOpen(true);
    };

    const handleSaveRow = () => {
        if (!editKlasifikasi) return;
        const isNew = !editKlasifikasi.id;
        const updated = {
            key: editKlasifikasi.key,
            value: editValue,
            ...(isNew && { jenis: "FREKUENSI" })
        };
        const url = isNew
            ? `${apiBaseUrl}/api/v1/peta-risiko/klasifikasi?template_id=${templateId}`
            : `${apiBaseUrl}/api/v1/peta-risiko/klasifikasi/${editKlasifikasi.id}`;
        const method = isNew ? axios.post : axios.put;

        method(url, updated, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }).then((res) => {
            const finalUpdated = isNew
                ? { ...updated, id: res.data.id }
                : { ...editKlasifikasi, value: editValue };

            setKlasifikasiFrekuensi((prev) =>
                prev.map((item) => item.key === finalUpdated.key ? finalUpdated : item)
            );
            setModalKlasifikasiOpen(false);
            setEditKlasifikasi(null);
            setEditValue("");
        }).catch((err) => {
            console.error("Gagal menyimpan klasifikasi:", err);
        });
    };

    const handleEditMeta = (kategoriKey, klasifikasiKey) => {
        const existing = metaFrekuensi.find(
            (item) => String(item.kategori) === String(kategoriKey) &&
                String(item.klasifikasi) === String(klasifikasiKey)
        );
        setMetaEdit({ id: existing?.id || null, kategori: kategoriKey, klasifikasi: klasifikasiKey });
        setMetaValue(existing?.value || "");
        setModalMetaOpen(true);
    };

    const handleSaveMeta = () => {
        if (!metaEdit) return;
        const isNew = !metaEdit.id;
        const body = {
            kategori: metaEdit.kategori,
            klasifikasi: metaEdit.klasifikasi,
            value: metaValue,
            ...(isNew && { jenis: "FREKUENSI" })
        };
        const url = isNew
            ? `${apiBaseUrl}/api/v1/peta-risiko/matriks?template_id=${templateId}`
            : `${apiBaseUrl}/api/v1/peta-risiko/matriks/${metaEdit.id}`;
        const method = isNew ? axios.post : axios.put;

        method(url, body, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }).then((res) => {
            const newMeta = isNew
                ? { ...body, id: res.data.id }
                : { ...metaEdit, value: metaValue };

            const updatedMeta = isNew
                ? [...metaFrekuensi, newMeta]
                : metaFrekuensi.map((m) =>
                    m.id === metaEdit.id ? { ...m, value: metaValue } : m
                );
            setMetaFrekuensi(updatedMeta);
            setModalMetaOpen(false);
            setMetaEdit(null);
            setMetaValue("");
        }).catch((err) => {
            console.error("Gagal simpan meta:", err);
        });
    };

    const handleDeleteRow = (klasifikasi) => setDeleteTarget(klasifikasi);

    const confirmDeleteRow = async () => {
        if (!deleteTarget) return;
        const isNew = !deleteTarget.id;

        try {
            if (!isNew) {
                const relatedMeta = metaFrekuensi.filter((item) => item.klasifikasi === deleteTarget.key);
                for (const meta of relatedMeta) {
                    await axios.delete(`${apiBaseUrl}/api/v1/peta-risiko/matriks/${meta.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
                await axios.delete(`${apiBaseUrl}/api/v1/peta-risiko/klasifikasi/${deleteTarget.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setKlasifikasiFrekuensi((prev) => prev.filter((item) => item.key !== deleteTarget.key));
            setMetaFrekuensi((prev) => prev.filter((item) => item.klasifikasi !== deleteTarget.key));
            setDeleteTarget(null);
        } catch (err) {
            console.error("Gagal hapus:", err);
        }
    };

    const handleOpenHeatmapModal = (item) => {
        setSelectedHeatmap(item);
        setHeatmapValue(item?.value || "");
        setHeatmapColor(item?.kode_warna || "#ffffff");
    };

    const handleSaveHeatmap = async () => {
        if (!selectedHeatmap?.id) return;
        try {
            await axios.put(`${apiBaseUrl}/api/v1/peta-risiko/heatmap/${selectedHeatmap.id}`, {
                value: heatmapValue,
                kode_warna: heatmapColor
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            // update local state
            setMetaHeatmap((prev) =>
                prev.map((m) =>
                    m.id === selectedHeatmap.id ? { ...m, value: heatmapValue, kode_warna: heatmapColor } : m
                )
            );
            setSelectedHeatmap(null);
        } catch (error) {
            console.error("Gagal update heatmap:", error);
        }
    };

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner color="primary" /> Loading...
            </div>
        );
    }

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Setting Matriks Risiko</h5>
                </CardHeader>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div className="d-flex">
                            <div className="mr-4">
                                <label>Frekuensi</label>
                                <input
                                    type="number"
                                    className="form-control form-control-sm rounded-3"
                                    value={template.frekuensi}
                                />
                            </div>
                            <div className="me-4">
                                <label>Dampak</label>
                                <input
                                    type="number"
                                    className="me-4 form-control form-control-sm rounded-3"
                                    value={template.dampak}
                                />
                            </div>
                        </div>
                        <div className="d-flex flex-column align-items-end">
                            <div>
                                <label>Selera Risiko</label>
                                <select className="form-control form-control-sm rounded-3">
                                    {[...Array(25).keys()].map((x) => (
                                        <option key={x} value={x + 1}>
                                            {x + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-end">
                        <button className="btn btn-sm bg-primary text-white">Terapkan</button>
                    </div>
                </div>
            </div>

            <Card className="shadow-sm border-0">
                <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Frekuensi</h5>
                </CardHeader>
                <CardBody style={{ overflowX: "hidden" }}>
                    <Table bordered hover className="w-100 text-center align-middle">
                        <thead>
                            <tr>
                                <th rowSpan="3" colSpan="3" className="align-middle">Peta Frekuensi</th>
                                <th colSpan={kategoriFrekuensi.length} className="align-middle">Kategori Frekuensi</th>
                            </tr>
                            <tr>
                                {kategoriFrekuensi.map((item) => <th key={`k-${item.key}`}>{item.key}</th>)}
                            </tr>
                            <tr>
                                {kategoriFrekuensi.map((item) => (
                                    <th
                                        key={`v-${item.key}`}
                                        className="bg-success text-white"
                                        style={{ cursor: "pointer" }}
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
                                        <td rowSpan={klasifikasiFrekuensi.length} className="align-middle fw-bold">Penjelasan</td>
                                    )}
                                    <td className="fw-bold">{klasifikasi.key}</td>
                                    <td className="bg-success text-white fw-bold" style={{ cursor: "pointer" }}
                                        onClick={() => handleEditClick(klasifikasi)}>
                                        {klasifikasi.value || "(klik untuk isi)"}
                                    </td>
                                    {kategoriFrekuensi.map((kategori) => (
                                        <td key={`${kategori.key}-${klasifikasi.key}`}
                                            className="bg-success text-white"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleEditMeta(kategori.key, klasifikasi.key)}>
                                            {getMetaValue(kategori.key, klasifikasi.key) || "(klik untuk isi)"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <div className="d-flex justify-content-center gap-1 mt-3 mb-4">
                        <button className="btn btn-sm bg-primary text-white" onClick={handleAddRow}>
                            <FiPlus size={16} />
                        </button>
                        <button className="btn btn-sm bg-soft-danger text-danger"
                            disabled={klasifikasiFrekuensi.length === 0}
                            onClick={() => handleDeleteRow(klasifikasiFrekuensi[klasifikasiFrekuensi.length - 1])}>
                            <FiTrash size={16} />
                        </button>
                    </div>
                </CardBody>

                <Modal isOpen={modalKategoriOpen} toggle={() => setModalKategoriOpen(false)}>
                    <ModalHeader toggle={() => setModalKategoriOpen(false)}>Edit Kategori Frekuensi</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="kategoriValue">Deskripsi Kategori</Label>
                            <Input
                                id="kategoriValue"
                                value={kategoriValue}
                                onChange={(e) => setKategoriValue(e.target.value)}
                                placeholder="Masukkan deskripsi kategori"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalKategoriOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveKategori}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal klasifikasi */}
                <Modal isOpen={modalKlasifikasiOpen} toggle={() => setModalKlasifikasiOpen(false)}>
                    <ModalHeader toggle={() => setModalKlasifikasiOpen(false)}>Isi Penjelasan Klasifikasi</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="editKlasifikasi">Penjelasan</Label>
                            <Input
                                id="editKlasifikasi"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Masukkan penjelasan klasifikasi"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalKlasifikasiOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveRow}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal meta frekuensi */}
                <Modal isOpen={modalMetaOpen} toggle={() => setModalMetaOpen(false)}>
                    <ModalHeader toggle={() => setModalMetaOpen(false)}>Isi Nilai Frekuensi</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="metaValue">Deskripsi Frekuensi</Label>
                            <Input
                                id="metaValue"
                                value={metaValue}
                                onChange={(e) => setMetaValue(e.target.value)}
                                placeholder="Masukkan isi frekuensi"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalMetaOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveMeta}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal delete konfirmasi */}
                <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)}>
                    <ModalHeader toggle={() => setDeleteTarget(null)}>Konfirmasi Hapus</ModalHeader>
                    <ModalBody>
                        Apakah kamu yakin ingin menghapus klasifikasi{" "}
                        <strong>{deleteTarget?.value || deleteTarget?.key}</strong> beserta semua datanya?
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-secondary text-white" onClick={() => setDeleteTarget(null)}>Batal</button>
                        <button className="btn btn-sm bg-danger text-white" onClick={confirmDeleteRow}>Hapus</button>
                    </ModalFooter>
                </Modal>
            </Card>

            <Card className="shadow-sm border-0">
                <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Dampak</h5>
                </CardHeader>
                <CardBody style={{ overflowX: "hidden" }}>
                    <Table bordered hover className="w-100 text-center align-middle">
                        <thead>
                            <tr>
                                <th rowSpan="3" colSpan="3" className="align-middle">Peta Dampak</th>
                                <th colSpan={kategoriDampak.length} className="align-middle">Kategori Dampak</th>
                            </tr>
                            <tr>
                                {kategoriDampak.map((item) => <th key={`k-${item.key}`}>{item.key}</th>)}
                            </tr>
                            <tr>
                                {kategoriDampak.map((item) => (
                                    <th
                                        key={`v-${item.key}`}
                                        className="bg-success text-white"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => handleEditKategori(item)}
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
                                        <td rowSpan={klasifikasiDampak.length} className="align-middle fw-bold">Penjelasan</td>
                                    )}
                                    <td className="fw-bold">{klasifikasi.key}</td>
                                    <td className="bg-success text-white fw-bold" style={{ cursor: "pointer" }}
                                        onClick={() => handleEditClick(klasifikasi)}>
                                        {klasifikasi.value || "(klik untuk isi)"}
                                    </td>
                                    {kategoriDampak.map((kategori) => (
                                        <td key={`${kategori.key}-${klasifikasi.key}`}
                                            className="bg-success text-white"
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleEditMeta(kategori.key, klasifikasi.key)}>
                                            {getMetaValueDampak(kategori.key, klasifikasi.key) || "(klik untuk isi)"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <div className="d-flex justify-content-center gap-1 mt-3 mb-4">
                        <button className="btn btn-sm bg-primary text-white" onClick={handleAddRow}>
                            <FiPlus size={16} />
                        </button>
                        <button className="btn btn-sm bg-soft-danger text-danger"
                            disabled={klasifikasiDampak.length === 0}
                            onClick={() => handleDeleteRow(klasifikasiDampak[klasifikasiDampak.length - 1])}>
                            <FiTrash size={16} />
                        </button>
                    </div>
                </CardBody>

                <Modal isOpen={modalKategoriOpen} toggle={() => setModalKategoriOpen(false)}>
                    <ModalHeader toggle={() => setModalKategoriOpen(false)}>Edit Kategori Dampak</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="kategoriValue">Deskripsi Kategori</Label>
                            <Input
                                id="kategoriValue"
                                value={kategoriValue}
                                onChange={(e) => setKategoriValue(e.target.value)}
                                placeholder="Masukkan deskripsi kategori"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalKategoriOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveKategori}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal klasifikasi */}
                <Modal isOpen={modalKlasifikasiOpen} toggle={() => setModalKlasifikasiOpen(false)}>
                    <ModalHeader toggle={() => setModalKlasifikasiOpen(false)}>Isi Penjelasan Klasifikasi</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="editKlasifikasi">Penjelasan</Label>
                            <Input
                                id="editKlasifikasi"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Masukkan penjelasan klasifikasi"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalKlasifikasiOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveRow}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal meta Dampak */}
                <Modal isOpen={modalMetaOpen} toggle={() => setModalMetaOpen(false)}>
                    <ModalHeader toggle={() => setModalMetaOpen(false)}>Isi Nilai Dampak</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="metaValue">Deskripsi Dampak</Label>
                            <Input
                                id="metaValue"
                                value={metaValue}
                                onChange={(e) => setMetaValue(e.target.value)}
                                placeholder="Masukkan isi Dampak"
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setModalMetaOpen(false)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveMeta}>Simpan</button>
                    </ModalFooter>
                </Modal>

                {/* Modal delete konfirmasi */}
                <Modal isOpen={!!deleteTarget} toggle={() => setDeleteTarget(null)}>
                    <ModalHeader toggle={() => setDeleteTarget(null)}>Konfirmasi Hapus</ModalHeader>
                    <ModalBody>
                        Apakah kamu yakin ingin menghapus klasifikasi{" "}
                        <strong>{deleteTarget?.value || deleteTarget?.key}</strong> beserta semua datanya?
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-secondary text-white" onClick={() => setDeleteTarget(null)}>Batal</button>
                        <button className="btn btn-sm bg-danger text-white" onClick={confirmDeleteRow}>Hapus</button>
                    </ModalFooter>
                </Modal>
            </Card>

            <Card className="shadow-sm border-0 mt-4">
                <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Peta Risiko</h5>
                </CardHeader>
                <CardBody style={{ overflowX: "auto" }}>
                    <Table bordered hover className="w-100 text-center align-middle">
                        <thead>
                            <tr>
                                <th rowSpan="3" colSpan="3" className="align-middle">Peta Risiko</th>
                                <th colSpan={kategoriDampak.length} className="align-middle">Dampak</th>
                            </tr>
                            <tr>
                                {kategoriDampak.map((item) => <th key={`k-${item.key}`}>{item.key}</th>)}
                            </tr>
                            <tr>
                                {kategoriDampak.map((d) => (
                                    <th key={`d-key-${d.key}`} className="">
                                        {d.value}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {kategoriFrekuensi.slice().reverse().map((f, index) => (
                                <tr key={f.key}>
                                    {/* hanya render "Frekuensi" sekali di baris pertama */}
                                    {index === 0 && (
                                        <td rowSpan={kategoriFrekuensi.length} className="align-middle fw-bold">
                                            Frekuensi
                                        </td>
                                    )}
                                    <td className="fw-bold">{f.key}</td>
                                    <td className="fw-bold">{f.value}</td>
                                    {kategoriDampak.map((d) => {
                                        const heat = metaHeatmap.find(
                                            (m) => String(m.frekuensi) === String(f.key) && String(m.dampak) === String(d.key)
                                        );
                                        return (
                                            <td
                                                key={`cell-${f.key}-${d.key}`}
                                                className="text-white"
                                                style={{ backgroundColor: heat?.kode_warna || "#eee", cursor: "pointer" }}
                                                onClick={() => handleOpenHeatmapModal(heat)}
                                            >
                                                {heat?.value || "-"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>

                    </Table>
                </CardBody>

                <Modal isOpen={!!selectedHeatmap} toggle={() => setSelectedHeatmap(null)}>
                    <ModalHeader toggle={() => setSelectedHeatmap(null)}>Edit Peta Risiko</ModalHeader>
                    <ModalBody>
                        <FormGroup>
                            <Label for="heatmapValue">Nilai</Label>
                            <Input
                                id="heatmapValue"
                                type="number"
                                value={heatmapValue}
                                onChange={(e) => setHeatmapValue(e.target.value)}
                                placeholder="Isi nilai peta risiko"
                            />
                        </FormGroup>

                        <FormGroup>
                            <Label for="heatmapColor">Warna</Label>
                            <div className="d-flex align-items-center gap-2">
                                <Input
                                    id="heatmapColorPicker"
                                    type="color"
                                    value={heatmapColor}
                                    onChange={(e) => setHeatmapColor(e.target.value)}
                                    style={{ width: "40px", height: "40px", padding: 0, border: "none", cursor: "pointer" }}
                                />
                                <Input
                                    id="heatmapColorText"
                                    type="text"
                                    value={heatmapColor}
                                    onChange={(e) => setHeatmapColor(e.target.value)}
                                    placeholder="#rrggbb atau rgb(r,g,b)"
                                />
                            </div>
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setSelectedHeatmap(null)}>Batal</button>
                        <button className="btn btn-sm bg-primary text-white" onClick={handleSaveHeatmap}>Simpan</button>
                    </ModalFooter>
                </Modal>


            </Card>

        </>
    );
};

export default DashboardMatriks;