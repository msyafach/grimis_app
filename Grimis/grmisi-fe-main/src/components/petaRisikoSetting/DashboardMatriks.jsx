import { useEffect, useState } from "react";
import { FiSave, FiCopy } from "react-icons/fi";
import axios from "axios";
import { Card, Button } from "react-bootstrap";
import { showToast } from "@/utils/toast";
import { useInstansi } from "../../context/InstansiContext";
import { useTahun } from "../../context/TahunContext";
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from "../../config/apiConfig";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import SalinTemplateModal from "./SalinTemplateModal";

const DashboardMatriks = () => {
  const { idInstansi } = useInstansi();
  const { tahunId } = useTahun();
  const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();
  const [frekuensi, setFrekuensi] = useState(1);
  const [dampak, setDampak] = useState(1);
  const [showModalSalin, setShowModalSalin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!idInstansi || !idIndukUnitKerja || !tahunId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(
          API_ENDPOINTS.getPetaView(tahunId, idInstansi, idIndukUnitKerja),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = res.data;
        setFrekuensi(data.template.frekuensi);
        setDampak(data.template.dampak);
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
      await axios.put(
        API_ENDPOINTS.putPetaTemplateById(idTemplate),
        {
          frekuensi: Number(frekuensi),
          dampak: Number(dampak),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      showToast("success", "Template berhasil Diperbarui!");
    } catch (err) {
      showToast("error", "Gagal menyimpan pengaturan template.");
      console.error(err);
    }
  };

  if (loading) {
    return <ContentLoaderWrapper loading={loading} error={error} />;
  }

  return (
    <>
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-end gap-3">
            <div style={{ width: "120px" }}>
              <label className="form-label mb-1 fw-semibold small text-uppercase">
                Dampak
              </label>
              <input
                type="number"
                min={1}
                className="form-control form-control-sm rounded-3"
                value={dampak}
                onChange={(e) => setDampak(e.target.value)}
              />
            </div>
            <div style={{ width: "120px" }}>
              <label className="form-label mb-1 fw-semibold small text-uppercase">
                Frekuensi
              </label>
              <input
                type="number"
                min={1}
                className="form-control form-control-sm rounded-3"
                value={frekuensi}
                onChange={(e) => setFrekuensi(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-primary px-3"
                type="button"
                onClick={handleTemplateUpdate}
              >
                <FiSave size={14} className="me-1" />
                Terapkan
              </button>
              <button
                className="btn btn-sm btn-dark px-3"
                type="button"
                onClick={handleTemplateUpdate}
              >
                <FiSave size={14} className="me-1" />
                Simpan Template
              </button>
              <button
                className="btn btn-sm btn-outline-secondary px-3"
                type="button"
                onClick={() => setShowModalSalin(true)}
              >
                <FiCopy size={14} className="me-1" />
                Salin Template
              </button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <SalinTemplateModal
        show={showModalSalin}
        onClose={() => setShowModalSalin(false)}
      />
    </>
  );
};

export default DashboardMatriks;
