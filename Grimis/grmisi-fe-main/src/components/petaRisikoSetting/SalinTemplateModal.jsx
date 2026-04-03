import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal, Form } from "react-bootstrap";
import axios from "axios";
import { FiCheckCircle } from "react-icons/fi";
import TablePernyataanRisiko from "@/components/shared/table/TablePernyataanRisiko";
import { showToast } from "@/utils/toast";
import API_ENDPOINTS from "../../config/apiConfig";
import { useTahun } from "../../context/TahunContext";
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import { useInstansi } from "../../context/InstansiContext";

const SalinTemplateModal = ({ show, onClose }) => {
  const { tahunId } = useTahun();
  const { idTemplate, idIndukUnitKerja } = useIndukUnitKerja();
  const { idInstansi } = useInstansi();
  const [templateList, setTemplateList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (show) {
      fetchTemplates();
    }
  }, [show]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Fetch example templates (standard ones)
      const res = await axios.get(API_ENDPOINTS.getPetaTemplateExamples(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTemplateList(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal mengambil daftar template.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (selectedTemplate) => {
    try {
      await axios.post(
        API_ENDPOINTS.postPetaTemplateCopy(
          selectedTemplate.id,
          idIndukUnitKerja,
          tahunId,
        ),
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("success", "Template berhasil disalin.");
      setSelectedId(selectedTemplate.id);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      showToast("error", "Gagal menyalin template.");
    }
  };

  const filteredTemplates = templateList.filter(
    (tpl) =>
      tpl.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tpl.kode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const tableData = filteredTemplates.map((tpl) => ({
    ...tpl,
    template_display: `${tpl.frekuensi} x ${tpl.dampak}`,
    tindakan: (
      <button
        className={`btn btn-sm ${selectedId === tpl.id ? "btn-success" : "btn-dark"} d-flex align-items-center gap-1`}
        onClick={() => handleSelect(tpl)}
      >
        {selectedId === tpl.id ? (
          <>
            <FiCheckCircle size={14} /> Disalin
          </>
        ) : (
          <>
            <FiCheckCircle size={14} /> Salin Template
          </>
        )}
      </button>
    ),
  }));

  const columns = [
    {
      accessorKey: "kode",
      header: () => "Kode",
    },
    {
      accessorKey: "nama",
      header: () => "Nama",
    },
    {
      accessorKey: "template_display",
      header: () => "Template (Frekuensi x Dampak)",
    },
    {
      accessorKey: "tindakan",
      header: "Tindakan",
      cell: (info) => info.getValue(),
    },
  ];

  return (
    <Modal show={show} onHide={onClose} size="xl" centered scrollable>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fs-5 fw-bold">Salin Template</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="mb-4" style={{ maxWidth: "300px" }}>
          <Form.Control
            type="text"
            placeholder="Pencarian"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-3"
          />
        </div>

        <TablePernyataanRisiko
          title="Daftar Template"
          data={tableData}
          columns={columns}
          isLoading={loading}
        />
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-danger px-4" onClick={onClose}>
          Batal
        </button>
      </Modal.Footer>
    </Modal>
  );
};

SalinTemplateModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SalinTemplateModal;
