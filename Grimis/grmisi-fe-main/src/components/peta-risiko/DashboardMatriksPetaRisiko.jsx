import React, { useEffect, useState } from "react";
import { Card, CardBody, CardHeader, Table, Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input } from "reactstrap";
import axios from "axios";
import { useInstansi } from '../../context/InstansiContext';
import { useTahun } from '../../context/TahunContext';
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from '../../config/apiConfig';

const DashboardMatriksPetaRisiko = () => {
    const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
    const [kategoriDampak, setKategoriDampak] = useState([]);
    const [metaHeatmap, setMetaHeatmap] = useState([]);
    const [selectedHeatmap, setSelectedHeatmap] = useState(null);
    const [heatmapValue, setHeatmapValue] = useState("");
    const [heatmapColor, setHeatmapColor] = useState("#ffffff");

    const apiBaseUrl = "http://localhost:8000";
    const token = localStorage.getItem("access_token");

    // Inject Dynamic Contexts
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();
    const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();

    useEffect(() => {
        if (!idInstansi || !tahunId || !idIndukUnitKerja) return;

        axios
            .get(API_ENDPOINTS.getPetaView(tahunId, idInstansi, idIndukUnitKerja), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                const data = res.data;
                setKategoriFrekuensi(data.kategori_frekuensi);
                setKategoriDampak(data.kategori_dampak);
                setMetaHeatmap(data.meta_heatmap);
            })
            .catch((err) => {
                console.error("Gagal fetch data peta risiko:", err);
            });
    }, []);

    const handleOpenHeatmapModal = (heat) => {
        setSelectedHeatmap(heat);
        setHeatmapValue(heat?.value || "");
        setHeatmapColor(heat?.kode_warna || "#ffffff");
    };

    const handleSaveHeatmap = () => {
        if (!selectedHeatmap) return;

        const updatedHeatmap = {
            value: heatmapValue,
            kode_warna: heatmapColor,
        };

        axios
            .put(
                `${apiBaseUrl}/api/v1/peta-risiko/heatmap/${selectedHeatmap.id}`,
                updatedHeatmap,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            )
            .then(() => {
                // Update local state
                setMetaHeatmap((prev) =>
                    prev.map((item) =>
                        item.id === selectedHeatmap.id
                            ? { ...item, value: heatmapValue, kode_warna: heatmapColor }
                            : item
                    )
                );
                setSelectedHeatmap(null);
            })
            .catch((err) => {
                console.error("Gagal menyimpan heatmap:", err);
            });
    };

    return (
        <Card className="shadow-sm border-0 mt-4">
            <CardHeader className="bg-white border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Peta Risiko</h5>
            </CardHeader>
            <CardBody style={{ overflowX: "auto" }}>
                <Table bordered hover className="w-100 text-center align-middle">
                    <thead>
                        <tr>
                            <th rowSpan="3" colSpan="3" className="align-middle">
                                Peta Risiko
                            </th>
                            <th colSpan={kategoriDampak.length} className="align-middle">
                                Dampak
                            </th>
                        </tr>
                        <tr>
                            {kategoriDampak.map((d) => (
                                <th key={`d-key-${d.key}`}>{d.value}</th>
                            ))}
                        </tr>
                        <tr>
                            {kategoriDampak.map((item) => (
                                <th key={`k-${item.key}`}>{item.key}</th>
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
                                            style={{
                                                backgroundColor: heat?.kode_warna || "#eee",
                                                cursor: "pointer",
                                                borderTop: heat?.atas ? "5px solid #000" : "1px solid #ddd",
                                                borderRight: heat?.kanan ? "5px solid #000" : "1px solid #ddd",
                                                borderBottom: heat?.bawah ? "5px solid #000" : "1px solid #ddd",
                                                borderLeft: heat?.kiri ? "5px solid #000" : "1px solid #ddd",
                                            }}
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

            {/* Modal untuk Edit Heatmap */}
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
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    padding: 0,
                                    border: "none",
                                    cursor: "pointer",
                                }}
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
                    <button className="btn btn-sm bg-soft-danger text-danger" onClick={() => setSelectedHeatmap(null)}>
                        Batal
                    </button>
                    <button className="btn btn-sm bg-primary text-white" onClick={handleSaveHeatmap}>
                        Simpan
                    </button>
                </ModalFooter>
            </Modal>
        </Card>
    );
};

export default DashboardMatriksPetaRisiko;
