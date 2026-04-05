import React, { useState, useEffect } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import axios from "axios";
import API_ENDPOINTS from "@/config/apiConfig";
import { useAuth } from "@/context/AuthContext";
import { useInstansi } from "@/context/InstansiContext";
import { useIndukUnitKerja } from "@/context/IndukUnitKerjaContext";
import { showToast } from "@/utils/toast";
import { Modal, Button, Form } from "react-bootstrap";
import {
  FiPlus,
  FiEye,
  FiEdit3,
  FiTrash2,
  FiMoreHorizontal,
} from "react-icons/fi";

const JenisKonteks = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Form state
  const [form, setForm] = useState({
    kode: "",
    nama: "",
    jenis: "SASARAN",
  });

  const { user } = useAuth();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const token = localStorage.getItem("access_token");

  const fetchData = async () => {
    if (!idInstansi) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        API_ENDPOINTS.getJenisKonteksAll(idInstansi),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setData(response.data || []);
    } catch (err) {
      console.error("Error fetching jenis konteks:", err);
      showToast("error", "Gagal memuat data jenis konteks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [idInstansi]);

  const handleAdd = async () => {
    if (!form.kode.trim() || !form.nama.trim()) {
      showToast("warning", "Kode dan Nama wajib diisi");
      return;
    }
    try {
      await axios.post(
        API_ENDPOINTS.postJenisKonteks,
        {
          kode: form.kode,
          nama: form.nama,
          jenis: form.jenis,
          id_instansi: idInstansi,
          id_induk_unit_kerja: idIndukUnitKerja,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast("success", "Jenis konteks berhasil ditambahkan");
      setShowAddModal(false);
      setForm({ kode: "", nama: "", jenis: "SASARAN" });
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Gagal menambahkan jenis konteks";
      showToast("error", msg);
    }
  };

  const handleEdit = async () => {
    if (!form.nama.trim()) {
      showToast("warning", "Nama wajib diisi");
      return;
    }
    try {
      await axios.put(
        API_ENDPOINTS.updateJenisKonteks(selectedItem.id),
        { nama: form.nama, jenis: form.jenis },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showToast("success", "Jenis konteks berhasil diubah");
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Gagal mengubah jenis konteks";
      showToast("error", msg);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(API_ENDPOINTS.deleteJenisKonteks(selectedItem.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", "Jenis konteks berhasil dihapus");
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Gagal menghapus jenis konteks";
      showToast("error", msg);
    }
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setForm({ kode: item.kode, nama: item.nama, jenis: item.jenis });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
    setActiveDropdown(null);
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
    setActiveDropdown(null);
  };

  const filteredData = data.filter(
    (item) =>
      item.kode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nama?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <PageHeader title="Jenis Konteks" />
      <div className="main-content" style={{ minHeight: "calc(100vh - 60px)" }}>
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">Data Jenis Konteks</h5>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setForm({ kode: "", nama: "", jenis: "SASARAN" });
                setShowAddModal(true);
              }}
            >
              <span>+ Tambah Jenis Konteks</span>
            </Button>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Pencarian"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-4 text-muted">
                Belum ada data jenis konteks
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>Tindakan</th>
                      <th>Kode</th>
                      <th>Jenis</th>
                      <th>Nama</th>
                      <th>Terakhir Diperbaharui</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="position-relative">
                            <button
                              className="btn btn-sm btn-link p-0 text-muted"
                              onClick={() =>
                                setActiveDropdown(
                                  activeDropdown === item.id ? null : item.id,
                                )
                              }
                            >
                              <FiMoreHorizontal />
                            </button>
                            {activeDropdown === item.id && (
                              <div
                                className="dropdown-menu show position-absolute shadow-sm"
                                style={{
                                  zIndex: 1050,
                                  minWidth: "150px",
                                  top: "100%",
                                  left: "0",
                                }}
                              >
                                <button
                                  className="dropdown-item py-2"
                                  onClick={() => openDetailModal(item)}
                                >
                                  <FiEye className="me-2" /> Detil Data
                                </button>
                                <button
                                  className="dropdown-item py-2"
                                  onClick={() => openEditModal(item)}
                                >
                                  <FiEdit3 className="me-2" /> Ubah Data
                                </button>
                                {user?.role === "SUPER_ADMIN" && (
                                  <button
                                    className="dropdown-item py-2 text-danger"
                                    onClick={() => openDeleteModal(item)}
                                  >
                                    <FiTrash2 className="me-2" /> Hapus Data
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{item.kode}</td>
                        <td>
                          <span
                            className={`badge ${item.jenis === "SASARAN" ? "bg-primary" : "bg-info"}`}
                          >
                            {item.jenis}
                          </span>
                        </td>
                        <td>{item.nama}</td>
                        <td>
                          {item.updated_at
                            ? new Date(item.updated_at)
                                .toLocaleString("id-ID")
                                .replace(/\//g, "-")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Tambah Jenis Konteks</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase mb-3">
                SASARAN / PROBIS
              </Form.Label>
              <div className="d-flex gap-4">
                <Form.Check
                  type="radio"
                  label="SASARAN"
                  name="jenis"
                  id="jenis-sasaran"
                  checked={form.jenis === "SASARAN"}
                  onChange={() => setForm({ ...form, jenis: "SASARAN" })}
                  className="fw-bold small"
                />
                <Form.Check
                  type="radio"
                  label="PROBIS"
                  name="jenis"
                  id="jenis-probis"
                  checked={form.jenis === "PROBIS"}
                  onChange={() => setForm({ ...form, jenis: "PROBIS" })}
                  className="fw-bold small"
                />
              </div>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                KODE *
              </Form.Label>
              <Form.Control
                type="text"
                className="form-control-sm rounded-2"
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                NAMA *
              </Form.Label>
              <Form.Control
                type="text"
                className="form-control-sm rounded-2"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="danger"
            className="bg-soft-danger text-danger border-0 px-4"
            onClick={() => setShowAddModal(false)}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            className="px-4"
            onClick={handleAdd}
            style={{ backgroundColor: "#1a233a" }}
          >
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Ubah Jenis Konteks</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase mb-3">
                SASARAN / PROBIS
              </Form.Label>
              <div className="d-flex gap-4">
                <Form.Check
                  type="radio"
                  label="SASARAN"
                  name="jenis-edit"
                  id="jenis-sasaran-edit"
                  checked={form.jenis === "SASARAN"}
                  onChange={() => setForm({ ...form, jenis: "SASARAN" })}
                  className="fw-bold small"
                />
                <Form.Check
                  type="radio"
                  label="PROBIS"
                  name="jenis-edit"
                  id="jenis-probis-edit"
                  checked={form.jenis === "PROBIS"}
                  onChange={() => setForm({ ...form, jenis: "PROBIS" })}
                  className="fw-bold small"
                />
              </div>
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                KODE *
              </Form.Label>
              <Form.Control
                type="text"
                className="form-control-sm rounded-2 bg-light"
                value={form.kode}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="fw-bold small text-muted text-uppercase">
                NAMA *
              </Form.Label>
              <Form.Control
                type="text"
                className="form-control-sm rounded-2"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="danger"
            className="bg-soft-danger text-danger border-0 px-4"
            onClick={() => setShowEditModal(false)}
          >
            Kembali
          </Button>
          <Button
            variant="primary"
            className="px-4"
            onClick={handleEdit}
            style={{ backgroundColor: "#1a233a" }}
          >
            Simpan
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Detil Jenis Konteks</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedItem && (
            <div>
              <div className="mb-4">
                <label className="fw-bold small text-muted text-uppercase d-block mb-3">
                  SASARAN / PROBIS
                </label>
                <div className="d-flex gap-4">
                  <Form.Check
                    type="radio"
                    label="SASARAN"
                    checked={selectedItem.jenis === "SASARAN"}
                    disabled
                    className="fw-bold small"
                  />
                  <Form.Check
                    type="radio"
                    label="PROBIS"
                    checked={selectedItem.jenis === "PROBIS"}
                    disabled
                    className="fw-bold small"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="fw-bold small text-muted text-uppercase d-block">
                  KODE *
                </label>
                <Form.Control
                  type="text"
                  className="form-control-sm rounded-2 bg-light"
                  value={selectedItem.kode}
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="fw-bold small text-muted text-uppercase d-block">
                  NAMA *
                </label>
                <Form.Control
                  type="text"
                  className="form-control-sm rounded-2 bg-light"
                  value={selectedItem.nama}
                  disabled
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="danger"
            className="bg-soft-danger text-danger border-0 px-4"
            onClick={() => setShowDetailModal(false)}
          >
            Kembali
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <h6 className="fw-bold">
            Apakah Anda yakin ingin menghapus data ini?
          </h6>
          <p className="text-muted small">Data akan dihapus secara permanen</p>
        </Modal.Body>
        <Modal.Footer className="justify-content-center border-0">
          <Button
            variant="light"
            className="px-4"
            onClick={() => setShowDeleteModal(false)}
          >
            Batal
          </Button>
          <Button variant="danger" className="px-4" onClick={handleDelete}>
            Iya
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default JenisKonteks;
