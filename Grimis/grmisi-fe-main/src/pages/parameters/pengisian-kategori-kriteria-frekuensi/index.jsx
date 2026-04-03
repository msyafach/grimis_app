import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import axios from "axios";
import API_ENDPOINTS from "@/config/apiConfig";
import { useInstansi } from "@/context/InstansiContext";
import { useIndukUnitKerja } from "@/context/IndukUnitKerjaContext";
import { useTahun } from "@/context/TahunContext";
import { showToast } from "@/utils/toast";
import { Modal, Button, Form } from "react-bootstrap";
import { FiPlus, FiMinus } from "react-icons/fi";

const KriteriaRisikoFrekuensiMatrix = () => {
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();

  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [kategoriFrekuensi, setKategoriFrekuensi] = useState([]);
  const [jenisKriteriaList, setJenisKriteriaList] = useState([]);
  const [matrixData, setMatrixData] = useState({});

  // Modal states
  const [showKategoriModal, setShowKategoriModal] = useState(false);
  const [showPenjelasanModal, setShowPenjelasanModal] = useState(false);
  const [showKriteriaModal, setShowKriteriaModal] = useState(false);
  const [showAddJenisModal, setShowAddJenisModal] = useState(false);

  // Form states
  const [kategoriForm, setKategoriForm] = useState({ key: "", value: "" });
  const [penjelasanForm, setPenjelasanForm] = useState({
    id: "",
    penjelasan: "",
  });
  const [kriteriaForm, setKriteriaForm] = useState({
    kategori_key: "",
    jenis_kriteria: "",
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
        console.log("Template not found, will generate one");
        templateRes = { data: [] };
      }

      let tmpl;
      if (templateRes.data && templateRes.data.length > 0) {
        tmpl = templateRes.data[0];
        setTemplate(tmpl);
      } else {
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

      // Get kategori frekuensi
      let kategoriRes;
      try {
        kategoriRes = await axios.get(
          API_ENDPOINTS.getPetaKategoriFrekuensi(tmpl.id),
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch (kategoriErr) {
        console.log("No kategori found, using defaults");
        kategoriRes = { data: [] };
      }

      if (kategoriRes.data && kategoriRes.data.length > 0) {
        setKategoriFrekuensi(kategoriRes.data);
      } else {
        setKategoriFrekuensi([
          { key: 1, value: "Hampir tidak terjadi" },
          { key: 2, value: "Jarang terjadi" },
          { key: 3, value: "Kadang terjadi" },
          { key: 4, value: "Sering terjadi" },
          { key: 5, value: "Hampir pasti terjadi" },
        ]);
      }

      // Get klasifikasi frekuensi for matrix structure
      let klasifikasiRes;
      try {
        klasifikasiRes = await axios.get(
          API_ENDPOINTS.getPetaKlasifikasiFrekuensi(tmpl.id),
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
          : ["Persentase dalam 1 tahun"],
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

    setJenisKriteriaList([...jenisKriteriaList, newJenisKriteria]);

    const newMatrixEntries = {};
    kategoriFrekuensi.forEach((kategori) => {
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
      setKategoriFrekuensi(
        kategoriFrekuensi.map((k) =>
          k.key === kategoriForm.key ? { ...k, value: kategoriForm.value } : k,
        ),
      );
      setShowKategoriModal(false);
      showToast("success", "Kategori berhasil disimpan");
    } catch (err) {
      showToast("error", "Gagal menyimpan kategori");
    }
  };

  // Modal B: Edit Penjelasan
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
      setJenisKriteriaList(
        jenisKriteriaList.map((j, i) =>
          i === penjelasanForm.id ? newName : j,
        ),
      );
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

      // Save kategori frekuensi
      for (const kategori of kategoriFrekuensi) {
        if (kategori.id) {
          await axios.put(
            API_ENDPOINTS.putPetaKategori(kategori.id),
            {
              key: kategori.key,
              value: kategori.value,
              jenis: "FREKUENSI",
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
              jenis: "FREKUENSI",
              penjelasan: kategori.penjelasan,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      }

      // Save klasifikasi/kriteria
      for (const [, data] of Object.entries(matrixData)) {
        if (!data.jenis_kriteria) continue;

        const payload = {
          key: data.key,
          value: data.value || "",
          jenis: "FREKUENSI",
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
          data.id = response.data.id;
        }
      }

      showToast("success", "Semua data berhasil disimpan");
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
      <PageHeader title="Pengisian Kategori dan Kriteria Frekuensi Risiko" />
      <div className="main-content">
        <div className="card p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h4 className="mb-1">
                Pengisian Kategori dan Kriteria Frekuensi Risiko
              </h4>
              <p className="text-muted mb-0">
                Pilih skala frekuensi dan atur kategori, penjelasan, serta
                kriteria untuk setiap level
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
                    {kategoriFrekuensi.map((k) => (
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
                        Peta Frekuensi
                      </th>
                      <th
                        colSpan={kategoriFrekuensi.length}
                        className="text-center align-middle"
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderColor: "#000",
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          padding: "8px",
                        }}
                      >
                        Kategori Frekuensi
                      </th>
                    </tr>
                    {/* Row 2: Level numbers */}
                    <tr>
                      {kategoriFrekuensi.map((k) => (
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
                      {kategoriFrekuensi.map((k) => (
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
                        {kategoriFrekuensi.map((kategori) => {
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
          <Modal.Title>Nilai Matriks FREKUENSI</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                }}
              >
                KATEGORI {kategoriForm.key}
              </Form.Label>
              <Form.Control
                type="text"
                value={kategoriForm.value}
                onChange={(e) =>
                  setKategoriForm({ ...kategoriForm, value: e.target.value })
                }
                placeholder="Contoh: Hampir tidak terjadi"
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

      {/* Modal B: Edit Penjelasan */}
      <Modal
        show={showPenjelasanModal}
        onHide={() => setShowPenjelasanModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Nilai Matriks FREKUENSI</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                }}
              >
                PENJELASAN {penjelasanForm.id + 1}
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
                placeholder="Contoh: Persentase dalam 1 tahun"
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
          <Modal.Title>Nilai Matriks FREKUENSI</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                }}
              >
                KATEGORI x PENJELASAN ({kriteriaForm.kategori_key} x{" "}
                {jenisKriteriaList.indexOf(kriteriaForm.jenis_kriteria) + 1})
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={kriteriaForm.kriteria}
                onChange={(e) =>
                  setKriteriaForm({ ...kriteriaForm, kriteria: e.target.value })
                }
                placeholder="Contoh: 0% < x ≤ 5%"
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
          <Modal.Title>Nilai Matriks FREKUENSI</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label
                style={{
                  fontWeight: "600",
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                }}
              >
                PENJELASAN {jenisKriteriaList.length + 1} (BARU)
              </Form.Label>
              <Form.Control
                type="text"
                value={newJenisKriteria}
                onChange={(e) => setNewJenisKriteria(e.target.value)}
                placeholder="Contoh: Jumlah frekuensi dalam 1 tahun"
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

export default KriteriaRisikoFrekuensiMatrix;
