import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import axios from "axios";
import API_ENDPOINTS from "@/config/apiConfig";
import { useAuth } from "@/context/AuthContext";
import { useInstansi } from "@/context/InstansiContext";
import { useIndukUnitKerja } from "@/context/IndukUnitKerjaContext";
import { useTahun } from "@/context/TahunContext";
import { showToast } from "@/utils/toast";
import { FiInfo } from "react-icons/fi";

const PemilihanWarnaMatriks = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
  const [kategoriDampak, setKategoriDampak] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);

  // Modal State
  const [selectedCell, setSelectedCell] = useState(null);
  const [modalValue, setModalValue] = useState("");
  const [hsl, setHsl] = useState({ h: 120, s: 100, l: 40 }); // Default green-ish

  const { user } = useAuth();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";

  const predefinedColors = [
    "#FF0000",
    "#FF8C00",
    "#FFFF00",
    "#8B4513",
    "#32CD32",
    "#008000",
    "#FF69B4",
    "#DA70D6",
    "#1E90FF",
    "#00CED1",
    "#000000",
    "#FFFFFF",
  ];

  // Helper: HSL to Hex
  const hslToHex = (h, s, l) => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  // Helper: Hex to HSL
  const hexToHsl = (hex) => {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  const currentHex = hslToHex(hsl.h, hsl.s, hsl.l);

  const fetchData = async () => {
    if (!idInstansi || !idIndukUnitKerja || !tahunId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await axios.get(
        API_ENDPOINTS.getPetaView(tahunId, idInstansi, idIndukUnitKerja),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const data = res.data;
      if (data.template) {
        setHeatmapData(data.meta_heatmap || []);
        setKategoriFrekuensi(
          [...data.kategori_frekuensi].sort(
            (a, b) => Number(a.key) - Number(b.key),
          ),
        );
        setKategoriDampak(
          [...data.kategori_dampak].sort(
            (a, b) => Number(a.key) - Number(b.key),
          ),
        );
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast("error", "Gagal memuat data matriks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [idInstansi, idIndukUnitKerja, tahunId]);

  const handleCellClick = (cell) => {
    if (!isAdmin) return;
    setSelectedCell(cell);
    setModalValue(cell.value || String(cell.frekuensi * cell.dampak));
    const color = cell.kode_warna || "#33cc00";
    setHsl(hexToHsl(color));
    setShowColorModal(true);
  };

  const handleSave = async () => {
    if (!selectedCell) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      await axios.put(
        API_ENDPOINTS.putPetaHeatmap(selectedCell.id),
        {
          kode_warna: currentHex,
          value: modalValue,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      showToast("success", "Nilai dan warna matriks berhasil diperbarui");
      setShowColorModal(false);
      fetchData();
    } catch (err) {
      console.error("Error saving:", err);
      showToast("error", "Gagal menyimpan perubahan");
    } finally {
      setLoading(false);
    }
  };

  const renderColorModal = () => {
    if (!showColorModal || !selectedCell) return null;

    return (
      <div
        className="modal show d-block"
        style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}
      >
        <div
          className="modal-dialog modal-dialog-centered"
          style={{ maxWidth: "450px" }}
        >
          <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div className="modal-body p-4 bg-white">
              <h5 className="fw-bold mb-4 text-dark">Nilai Matriks HEATMAP</h5>

              {/* Input Nilai (Dampak x Frekuensi) */}
              <div className="mb-4 position-relative">
                <label
                  className="position-absolute px-2 bg-white"
                  style={{
                    top: "-10px",
                    left: "15px",
                    fontSize: "11px",
                    zIndex: 1,
                    color: "#666",
                    fontWeight: "600",
                  }}
                >
                  DAMPAK x FREKUENSI ({selectedCell.dampak} ×{" "}
                  {selectedCell.frekuensi})
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg border-2 rounded-3"
                  style={{ paddingTop: "15px", fontWeight: "bold" }}
                  value={modalValue}
                  onChange={(e) => setModalValue(e.target.value)}
                />
              </div>

              {/* Color Picker Area */}
              <div
                className="color-picker-container p-3 border rounded-3 mb-4 shadow-sm"
                style={{ backgroundColor: "#fcfcfc" }}
              >
                {/* Main Visual Area: Saturation/Brightness using HSL */}
                <div
                  className="mb-3 rounded-2 position-relative overflow-hidden"
                  style={{
                    height: "180px",
                    backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
                    border: "1px solid #ddd",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background:
                        "linear-gradient(to right, #fff, transparent)",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "linear-gradient(to top, #000, transparent)",
                    }}
                  ></div>
                  <div
                    style={{
                      position: "absolute",
                      left: `${hsl.s}%`,
                      top: `${100 - hsl.l}%`,
                      width: "12px",
                      height: "12px",
                      border: "2px solid white",
                      borderRadius: "50%",
                      transform: "translate(-50%, -50%)",
                      boxShadow: "0 0 2px rgba(0,0,0,0.5)",
                    }}
                  ></div>
                </div>

                {/* Hue Slider */}
                <div className="mb-3">
                  <input
                    type="range"
                    className="form-range custom-hue-slider"
                    min="0"
                    max="360"
                    value={hsl.h}
                    onChange={(e) =>
                      setHsl({ ...hsl, h: parseInt(e.target.value) })
                    }
                  />
                </div>

                {/* Lightness Slider */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="flex-grow-1">
                    <input
                      type="range"
                      className="form-range custom-lightness-slider"
                      min="0"
                      max="100"
                      value={hsl.l}
                      onChange={(e) =>
                        setHsl({ ...hsl, l: parseInt(e.target.value) })
                      }
                      style={{
                        background: `linear-gradient(to right, #000, hsl(${hsl.h}, ${hsl.s}%, 50%), #fff)`,
                      }}
                    />
                  </div>
                  <div
                    className="rounded-2"
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: currentHex,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px #ddd",
                    }}
                  ></div>
                </div>

                {/* Hex/RGB Inputs */}
                <div className="d-flex gap-2 mb-3">
                  <div className="flex-grow-1 text-center">
                    <input
                      type="text"
                      className="form-control form-control-sm text-center fw-bold"
                      value={currentHex.replace("#", "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length === 6 || val.length === 3) {
                          setHsl(hexToHsl("#" + val));
                        }
                      }}
                    />
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      Hex
                    </small>
                  </div>
                  <div style={{ width: "50px" }} className="text-center">
                    <input
                      type="text"
                      className="form-control form-control-sm text-center"
                      value={hsl.h}
                      readOnly
                    />
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      H
                    </small>
                  </div>
                  <div style={{ width: "50px" }} className="text-center">
                    <input
                      type="text"
                      className="form-control form-control-sm text-center"
                      value={hsl.s}
                      readOnly
                    />
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      S
                    </small>
                  </div>
                  <div style={{ width: "50px" }} className="text-center">
                    <input
                      type="text"
                      className="form-control form-control-sm text-center"
                      value={hsl.l}
                      readOnly
                    />
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      L
                    </small>
                  </div>
                </div>

                {/* Predefined Swatches */}
                <div className="d-flex flex-wrap gap-2 justify-content-between">
                  {predefinedColors.map((color) => (
                    <div
                      key={color}
                      onClick={() => setHsl(hexToHsl(color))}
                      style={{
                        width: "24px",
                        height: "24px",
                        backgroundColor: color,
                        cursor: "pointer",
                        borderRadius: "4px",
                        border:
                          currentHex === color
                            ? "2px solid #000"
                            : "1px solid #ddd",
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="d-flex gap-2 justify-content-end">
                <button
                  className="btn btn-lg px-4 rounded-3 text-white"
                  style={{
                    backgroundColor: "#FF4500",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                  onClick={() => setShowColorModal(false)}
                >
                  Batal
                </button>
                <button
                  className="btn btn-lg px-4 rounded-3 text-white"
                  style={{
                    backgroundColor: "#0A0A32",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "..." : "Simpan"}
                </button>
              </div>
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
        <div className="card border-0 shadow-sm p-4 rounded-4">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h4 className="mb-1 fw-bold">Pemilihan Warna Matriks Risiko</h4>
              <p className="text-muted">
                Sesuaikan nilai dan warna visual heatmap berdasarkan kebijakan
                manajemen risiko entitas.
              </p>
            </div>
            <div className="alert alert-soft-primary d-flex align-items-center gap-2 mb-0 py-2 rounded-3 border-0">
              <FiInfo size={18} />
              <small className="fw-semibold">
                Klik kotak angka untuk mengatur nilai & warna
              </small>
            </div>
          </div>

          {!idIndukUnitKerja ? (
            <div className="alert alert-warning text-center rounded-3">
              Silakan pilih Induk Unit Kerja terlebih dahulu
            </div>
          ) : loading && heatmapData.length === 0 ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered text-center align-middle mb-0 custom-heatmap-table">
                <thead>
                  <tr className="bg-light">
                    <th
                      rowSpan="3"
                      colSpan="3"
                      className="fw-bold text-dark border-bottom-0"
                    >
                      Peta Risiko
                    </th>
                    <th
                      colSpan={kategoriDampak.length}
                      className="fw-bold text-dark border-bottom-0"
                    >
                      Dampak
                    </th>
                  </tr>
                  <tr className="bg-light">
                    {kategoriDampak.map((d) => (
                      <th key={d.key} className="text-dark">
                        {d.key}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-light">
                    {kategoriDampak.map((d) => (
                      <th
                        key={d.id}
                        className="small text-wrap fw-semibold text-dark"
                        style={{ minWidth: "100px" }}
                      >
                        {d.value || `Dampak ${d.key}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kategoriFrekuensi
                    .slice()
                    .reverse()
                    .map((f, index) => (
                      <tr key={f.id}>
                        {index === 0 && (
                          <td
                            rowSpan={kategoriFrekuensi.length}
                            className="fw-bold text-dark"
                            style={{
                              writingMode: "vertical-rl",
                              transform: "rotate(180deg)",
                            }}
                          >
                            Frekuensi
                          </td>
                        )}
                        <td className="fw-bold bg-light text-dark">{f.key}</td>
                        <td
                          className="fw-bold bg-light small text-wrap text-dark fw-semibold"
                          style={{ minWidth: "120px" }}
                        >
                          {f.value || `Frekuensi ${f.key}`}
                        </td>
                        {kategoriDampak.map((d) => {
                          const cell = heatmapData.find(
                            (m) =>
                              String(m.frekuensi) === String(f.key) &&
                              String(m.dampak) === String(d.key),
                          );
                          return (
                            <td
                              key={`${f.key}-${d.key}`}
                              style={{
                                backgroundColor: cell?.kode_warna || "#eee",
                                cursor: isAdmin ? "pointer" : "default",
                                height: "85px",
                                transition: "all 0.2s",
                                border: "1px solid #dee2e6",
                              }}
                              className="text-white position-relative heatmap-cell"
                              onClick={() => cell && handleCellClick(cell)}
                            >
                              <div className="fs-3 fw-bold shadow-text">
                                {cell?.value || f.key * d.key}
                              </div>
                              <div
                                className="position-absolute bottom-0 end-0 p-1 small opacity-75 fw-bold"
                                style={{ fontSize: "10px" }}
                              >
                                {f.key}x{d.key}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <style>{`
                .shadow-text { text-shadow: 1px 1px 3px rgba(0,0,0,0.6); }
                .heatmap-cell:hover { transform: scale(0.97); z-index: 10; box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important; opacity: 0.9; }
                .custom-hue-slider {
                    appearance: none;
                    background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
                    height: 12px;
                    border-radius: 6px;
                }
                .custom-lightness-slider {
                    appearance: none;
                    height: 12px;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                }
                .form-range::-webkit-slider-thumb {
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    background: #007bff;
                    border: 3px solid #fff;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 3px rgba(0,0,0,0.3);
                }
                .custom-heatmap-table th, .custom-heatmap-table td { border-color: #dee2e6 !important; }
            `}</style>
      {renderColorModal()}
    </>
  );
};

export default PemilihanWarnaMatriks;
