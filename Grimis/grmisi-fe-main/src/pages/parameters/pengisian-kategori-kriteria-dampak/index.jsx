import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import axios from "axios";
import API_ENDPOINTS from "@/config/apiConfig";
import { useInstansi } from "@/context/InstansiContext";
import { useIndukUnitKerja } from "@/context/IndukUnitKerjaContext";
import { useTahun } from "@/context/TahunContext";
import { showToast } from "@/utils/toast";
import { Modal, Button, Form, Table } from "react-bootstrap";
import { FiPlus, FiMinus } from "react-icons/fi";

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
  const [kategoriForm, setKategoriForm] = useState({ key: "", value: "" });
  const [penjelasanForm, setPenjelasanForm] = useState({
    id: "",
    penjelasan: "",
  });
  const [kriteriaForm, setKriteriaForm] = useState({
    kategori_id: "",
    jenis_kriteria_id: "",
    kriteria: "",
    formula: "",
  });
  const [newJenisKriteria, setNewJenisKriteria] = useState("");

  const token = localStorage.getItem("access_token");

  // Fetch template and initial data
  const fetchData = useCallback(async () => {
    if (!idInstansi || !idIndukUnitKerja || !tahunId) return;

    setLoading(true);
    try {
      // Get template
      let templateRes;
      try {
        templateRes = await axios.get(
          API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(
            tahunId,
            idIndukUnitKerja,
          ),
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (templateErr) {
        // Template might not exist, we'll generate one
        console.log("Template not found, will generate one");
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
            API_ENDPOINTS.postPetaTemplate(
              tahunId,
              idInstansi,
              idIndukUnitKerja,
            ),
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
          tmpl = generateRes.data;
          setTemplate(tmpl);
          showToast("success", "Template baru berhasil dibuat");
        } catch (genErr) {
          console.error("Failed to generate template:", genErr);
          showToast(
            "error",
            "Gagal membuat template. Silakan buat template di menu Setting Matriks Risiko terlebih dahulu.",
          );
          setLoading(false);
          return;
        }
      }

      // Get kategori dampak - use sync if needed
      let kategoriRes;
      try {
        kategoriRes = await axios.get(
          API_ENDPOINTS.getPetaKategoriDampak(tmpl.id),
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (kategoriErr) {
        console.log("No kategori found, using defaults");
        kategoriRes = { data: [] };
      }

      if (kategoriRes.data && kategoriRes.data.length > 0) {
        setKategoriDampak(kategoriRes.data);
      } else {
        // Use default kategori
        setKategoriDampak([
          { key: 1, value: "Tidak Signifikan" },
          { key: 2, value: "Minor" },
          { key: 3, value: "Moderat" },
          { key: 4, value: "Signifikan" },
          { key: 5, value: "Sangat Signifikan" },
        ]);
      }

      // Get klasifikasi dampak for matrix structure
      let klasifikasiRes;
      try {
        klasifikasiRes = await axios.get(
          API_ENDPOINTS.getPetaKlasifikasiDampak(tmpl.id),
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (klasifikasiErr) {
        console.log("No klasifikasi found");
        klasifikasiRes = { data: [] };
      }

      // Build jenis kriteria list from existing data
      const existingJenis = new Set();
      const matrix = {};

      (klasifikasiRes.data || []).forEach((item) => {
        if (item.jenis_kriteria) {
          existingJenis.add(item.jenis_kriteria);
        }
        const key = `${item.key}_${item.jenis_kriteria || "default"}`;
        matrix[key] = item;
      });

      setJenisKriteriaList(
        Array.from(existingJenis).length > 0
          ? Array.from(existingJenis)
          : ["Beban Keuangan Negara"],
      );
      setMatrixData(matrix);
    } catch (err) {
      console.error("Error fetching data:", err);
      showToast(
        "error",
        "Gagal memuat data. Pastikan Setting Matriks Risiko sudah dikonfigurasi.",
      );
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
      showToast("warning", "Masukkan nama jenis kriteria");
      return;
    }
    if (jenisKriteriaList.includes(newJenisKriteria)) {
      showToast("warning", "Jenis kriteria sudah ada");
      return;
    }

    // Add to jenis kriteria list
    setJenisKriteriaList([...jenisKriteriaList, newJenisKriteria]);

    // Create empty matrix entries for each kategori to persist the row
    const newMatrixEntries = {};
    kategoriDampak.forEach((kategori) => {
      const key = `${kategori.key}_${newJenisKriteria}`;
      newMatrixEntries[key] = {
        key: kategori.key,
        jenis_kriteria: newJenisKriteria,
        value: "",
        formula: "",
      };
    });
    setMatrixData({ ...matrixData, ...newMatrixEntries });

    setNewJenisKriteria("");
    showToast("success", "Jenis kriteria ditambahkan");
  };

  // Handle remove jenis kriteria
  const handleRemoveJenisKriteria = (jenis) => {
    if (jenisKriteriaList.length <= 1) {
      showToast("warning", "Minimal harus ada 1 jenis kriteria");
      return;
    }
    setJenisKriteriaList(jenisKriteriaList.filter((j) => j !== jenis));
    showToast("success", "Jenis kriteria dihapus");
  };

  // Modal A: Edit Kategori
  const openKategoriModal = (kategori) => {
    setKategoriForm({ key: kategori.key, value: kategori.value || "" });
    setShowKategoriModal(true);
  };

  const saveKategori = async () => {
    try {
      // Update local state
      setKategoriDampak(
        kategoriDampak.map((k) =>
          k.key === kategoriForm.key ? { ...k, value: kategoriForm.value } : k,
        ),
      );
      setShowKategoriModal(false);
      showToast("success", "Kategori berhasil disimpan");
    } catch (err) {
      showToast("error", "Gagal menyimpan kategori");
    }
  };

  // Modal B: Edit Penjelasan (row label / jenis kriteria name)
  const openPenjelasanModal = (jenis, rowIndex) => {
    setPenjelasanForm({
      id: rowIndex,
      nama: jenis,
      penjelasan: jenis,
    });
    setShowPenjelasanModal(true);
  };

  const savePenjelasan = async () => {
    try {
      const oldName = jenisKriteriaList[penjelasanForm.id];
      const newName = penjelasanForm.penjelasan.trim();
      if (!newName) {
        showToast("warning", "Nama penjelasan tidak boleh kosong");
        return;
      }
      // Update jenis kriteria list
      setJenisKriteriaList(
        jenisKriteriaList.map((j, i) =>
          i === penjelasanForm.id ? newName : j,
        ),
      );
      // Update matrixData keys that reference the old jenis name
      if (oldName !== newName) {
        const updatedMatrix = {};
        for (const [key, data] of Object.entries(matrixData)) {
          if (data.jenis_kriteria === oldName) {
            const newKey = `${data.key}_${newName}`;
            updatedMatrix[newKey] = { ...data, jenis_kriteria: newName };
          } else {
            updatedMatrix[key] = data;
          }
        }
        setMatrixData(updatedMatrix);
      }
      setShowPenjelasanModal(false);
      showToast("success", "Penjelasan berhasil disimpan");
    } catch (err) {
      showToast("error", "Gagal menyimpan penjelasan");
    }
  };

  // Modal C: Edit Kriteria
  const openKriteriaModal = (kategori, jenisKriteria) => {
    const key = `${kategori.key}_${jenisKriteria}`;
    const existingData = matrixData[key] || {};

    setKriteriaForm({
      kategori_key: kategori.key,
      jenis_kriteria: jenisKriteria,
      kategori_value: kategori.value,
      kriteria: existingData.value || "",
      formula: existingData.formula || "",
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
          formula: kriteriaForm.formula,
        },
      });
      setShowKriteriaModal(false);
      showToast("success", "Kriteria berhasil disimpan");
    } catch (err) {
      showToast("error", "Gagal menyimpan kriteria");
    }
  };

  // Save all data to backend
  const handleSaveAll = async () => {
    if (!template?.id) {
      showToast(
        "error",
        "Template belum tersedia. Silakan muat ulang halaman.",
      );
      return;
    }
    try {
      setLoading(true);

      // Save kategori dampak: PUT if has id, POST if new
      for (const kategori of kategoriDampak) {
        if (kategori.id) {
          await axios.put(
            API_ENDPOINTS.putPetaKategori(kategori.id),
            {
              key: kategori.key,
              value: kategori.value,
              jenis: "DAMPAK",
              penjelasan: kategori.penjelasan,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } else {
          await axios.post(
            API_ENDPOINTS.postPetaKategori(template.id),
            {
              key: kategori.key,
              value: kategori.value,
              jenis: "DAMPAK",
              penjelasan: kategori.penjelasan,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      }

      // Save klasifikasi/kriteria: PUT if has id, POST if new
      // Save all entries that have jenis_kriteria to persist row structure
      for (const [, data] of Object.entries(matrixData)) {
        // Skip entries without jenis_kriteria (incomplete data)
        if (!data.jenis_kriteria) continue;

        const payload = {
          key: data.key,
          value: data.value || "", // Allow empty value
          jenis: "DAMPAK",
          jenis_kriteria: data.jenis_kriteria,
          formula: data.formula || "",
        };

        if (data.id) {
          await axios.put(API_ENDPOINTS.putPetaKlasifikasi(data.id), payload, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          const response = await axios.post(
            API_ENDPOINTS.postPetaKlasifikasi(template.id),
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          // Update matrixData with the created id
          data.id = response.data.id;
        }
      }

      showToast("success", "Semua data berhasil disimpan");
      fetchData(); // Refresh data to get newly created IDs
    } catch (err) {
      console.error("Error saving:", err);
      const msg = err?.response?.data?.detail || "Gagal menyimpan data";
      showToast("error", msg);
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
              <h4 className="mb-1">
                Pengisian Kategori dan Kriteria Dampak Risiko
              </h4>
              <p className="text-muted mb-0">
                Pilih skala dampak dan atur kategori, penjelasan, serta kriteria
                untuk setiap level
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleSaveAll}
              disabled={loading}
            >
              {loading ? "Menyimpan..." : "Simpan Semua"}
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
                <table
                  className="table table-bordered mb-0"
                  style={{
                    tableLayout: "fixed",
                    minWidth: "900px",
                    borderColor: "#000",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "40px" }} />
                    <col style={{ width: "35px" }} />
                    <col style={{ width: "155px" }} />
                    {kategoriDampak.map((k) => (
                      <col key={`col-${k.key}`} />
                    ))}
                  </colgroup>
                  <thead>
                    {/* Row 1: Top header row */}
                    <tr>
                      <th
                        colSpan="3"
                        rowSpan="3"
                        className="text-center align-middle"
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderColor: "#000",
                          padding: "8px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                        }}
                      >
                        Peta Dampak
                      </th>
                      <th
                        colSpan={kategoriDampak.length}
                        className="text-center align-middle"
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderColor: "#000",
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          padding: "8px",
                        }}
                      >
                        Kategori Dampak
                      </th>
                    </tr>
                    {/* Row 2: Level numbers */}
                    <tr>
                      {kategoriDampak.map((k) => (
                        <th
                          key={k.key}
                          className="text-center align-middle"
                          style={{
                            backgroundColor: "#00cc00",
                            borderColor: "#000",
                            color: "#000",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            padding: "6px",
                          }}
                        >
                          {k.key}
                        </th>
                      ))}
                    </tr>
                    {/* Row 3: Category names */}
                    <tr>
                      {kategoriDampak.map((k) => (
                        <th
                          key={`name-${k.key}`}
                          className="text-center align-middle"
                          style={{
                            backgroundColor: "#00cc00",
                            borderColor: "#000",
                            color: "#000",
                            fontSize: "clamp(0.65rem, 1.2vw, 0.85rem)",
                            fontWeight: "bold",
                            padding: "6px 4px",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            lineHeight: "1.3",
                            cursor: "pointer",
                          }}
                          onClick={() => openKategoriModal(k)}
                          title="Klik untuk edit kategori"
                        >
                          {k.value || `Level ${k.key}`} ({k.key})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jenisKriteriaList.map((jenis, rowIndex) => (
                      <tr key={jenis}>
                        {/* Column 1: Penjelasan vertical text (only on first row) */}
                        {rowIndex === 0 && (
                          <td
                            rowSpan={jenisKriteriaList.length}
                            className="text-center align-middle"
                            style={{
                              backgroundColor: "#f8f9fa",
                              borderColor: "#000",
                              width: "50px",
                              padding: "4px",
                            }}
                          >
                            <div
                              style={{
                                writingMode: "vertical-rl",
                                textOrientation: "mixed",
                                transform: "rotate(180deg)",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                letterSpacing: "1px",
                              }}
                            >
                              Penjelasan
                            </div>
                          </td>
                        )}
                        {/* Column 2: Row number */}
                        <td
                          className="text-center align-middle"
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: "#000",
                            width: "35px",
                            minWidth: "35px",
                            maxWidth: "35px",
                            fontWeight: "bold",
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            padding: "4px",
                          }}
                        >
                          {rowIndex + 1}
                        </td>
                        {/* Column 3: Jenis Kriteria name (Step B: clickable) */}
                        <td
                          className="text-center align-middle"
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: "#000",
                            width: "155px",
                            minWidth: "155px",
                            maxWidth: "155px",
                            padding: "8px 6px",
                            fontWeight: "700",
                            fontSize: "clamp(0.6rem, 1vw, 0.82rem)",
                            lineHeight: "1.35",
                            cursor: "pointer",
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            overflow: "hidden",
                          }}
                          onClick={() => openPenjelasanModal(jenis, rowIndex)}
                          title="Klik untuk edit penjelasan"
                        >
                          {jenis}
                        </td>
                        {/* Data cells: columns with green background */}
                        {kategoriDampak.map((kategori) => {
                          const cellData = getCellData(kategori.key, jenis);
                          return (
                            <td
                              key={`${kategori.key}_${jenis}`}
                              className="align-middle"
                              style={{
                                backgroundColor: "#00cc00",
                                borderColor: "#000",
                                cursor: "pointer",
                                fontSize: "clamp(0.6rem, 1vw, 0.8rem)",
                                padding: "6px 4px",
                                lineHeight: "1.35",
                                verticalAlign: "middle",
                                color: "#000",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                                overflow: "hidden",
                                width: "0",
                                minWidth: "0",
                              }}
                              onClick={() => openKriteriaModal(kategori, jenis)}
                              title="Klik untuk edit kriteria"
                            >
                              {cellData.value ? (
                                <div
                                  style={{
                                    fontSize: "clamp(0.6rem, 1vw, 0.75rem)",
                                    lineHeight: "1.35",
                                  }}
                                >
                                  {cellData.value}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "rgba(0,0,0,0.4)",
                                    fontStyle: "italic",
                                    textAlign: "center",
                                  }}
                                >
                                  Klik untuk isi
                                </div>
                              )}
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
                <div
                  className="d-flex gap-1"
                  style={{
                    border: "1px solid #dee2e6",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    className="btn btn-outline-secondary border-0"
                    onClick={() => setShowAddJenisModal(true)}
                    style={{ padding: "4px 14px", borderRadius: 0 }}
                  >
                    <FiPlus size={16} />
                  </button>
                  <button
                    className="btn btn-outline-secondary border-0"
                    onClick={() =>
                      jenisKriteriaList.length > 1 &&
                      handleRemoveJenisKriteria(
                        jenisKriteriaList[jenisKriteriaList.length - 1],
                      )
                    }
                    style={{
                      padding: "4px 14px",
                      borderRadius: 0,
                      borderLeft: "1px solid #dee2e6",
                    }}
                    disabled={jenisKriteriaList.length <= 1}
                  >
                    <FiMinus size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />

      {/* Modal A: Edit Kategori */}
      <Modal
        show={showKategoriModal}
        onHide={() => setShowKategoriModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nilai Matriks Dampak</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  fontSize: "0.85rem",
                }}
              >
                Kategori {kategoriForm.key}
              </Form.Label>
              <Form.Control
                type="text"
                value={kategoriForm.value}
                onChange={(e) =>
                  setKategoriForm({ ...kategoriForm, value: e.target.value })
                }
                placeholder="Contoh: Tidak Signifikan"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-danger"
            onClick={() => setShowKategoriModal(false)}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={saveKategori}>
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal B: Edit Penjelasan (row label) */}
      <Modal
        show={showPenjelasanModal}
        onHide={() => setShowPenjelasanModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nilai Matriks Dampak</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  fontSize: "0.85rem",
                }}
              >
                Penjelasan {penjelasanForm.id + 1}
              </Form.Label>
              <Form.Control
                type="text"
                value={penjelasanForm.penjelasan}
                onChange={(e) =>
                  setPenjelasanForm({
                    ...penjelasanForm,
                    penjelasan: e.target.value,
                  })
                }
                placeholder="Contoh: Beban Keuangan Negara"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-danger"
            onClick={() => setShowPenjelasanModal(false)}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={savePenjelasan}>
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal C: Edit Kriteria */}
      <Modal
        show={showKriteriaModal}
        onHide={() => setShowKriteriaModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nilai Matriks Dampak</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  fontSize: "0.85rem",
                }}
              >
                Kategori x Penjelasan ({kriteriaForm.kategori_key} x{" "}
                {jenisKriteriaList.indexOf(kriteriaForm.jenis_kriteria) + 1})
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={kriteriaForm.kriteria}
                onChange={(e) =>
                  setKriteriaForm({ ...kriteriaForm, kriteria: e.target.value })
                }
                placeholder="Contoh: ≤0,01% dari total anggaran non belanja pegawai pada unit pemilik risiko"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-danger"
            onClick={() => setShowKriteriaModal(false)}
          >
            Batal
          </Button>
          <Button variant="primary" onClick={saveKriteria}>
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal D: Add Jenis Kriteria */}
      <Modal
        show={showAddJenisModal}
        onHide={() => setShowAddJenisModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nilai Matriks Dampak</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  fontSize: "0.85rem",
                }}
              >
                Penjelasan {jenisKriteriaList.length + 1} (Baru)
              </Form.Label>
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
          <Button
            variant="outline-danger"
            onClick={() => setShowAddJenisModal(false)}
          >
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
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default KriteriaRisikoDampakMatrix;
