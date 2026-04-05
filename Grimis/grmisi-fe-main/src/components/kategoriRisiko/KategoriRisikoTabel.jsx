import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Modal, Button } from "react-bootstrap";
import Table from "@/components/shared/table/Table";
import { showToast } from "@/utils/toast";
import { useInstansi } from "../../context/InstansiContext";
import { useIndukUnitKerja } from "../../context/IndukUnitKerjaContext";
import API_ENDPOINTS from "../../config/apiConfig";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import { getKategoriRisikoColumns } from "./kategoriRisikoColumns";
import {
  validateInstansiId,
  validateIndukUnitKerjaId,
} from "@/utils/validateIds";
import { useAuth } from "../../context/AuthContext";

const KategoriRisikoTabel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const [kategoriRisiko, setKategoriRisiko] = useState([]);
  const [selectedKategoriRisiko, setSelectedKategoriRisiko] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setErrorMessage("Token tidak ditemukan. Silakan login ulang.");
          return;
        }

        // Validate instansi ID before using it
        const instansiValidation = await validateInstansiId(idInstansi, token);
        if (!instansiValidation.valid) {
          setErrorMessage(instansiValidation.message);
          setLoading(false);
          return;
        }

        // Validate induk unit kerja ID if available
        if (idIndukUnitKerja) {
          const indukUnitValidation = await validateIndukUnitKerjaId(
            idIndukUnitKerja,
            token,
          );
          if (!indukUnitValidation.valid) {
            console.warn(
              "Induk unit kerja ID tidak valid, tapi akan tetap melanjutkan operasi",
            );
          }
        }

        let response;
        if (idIndukUnitKerja) {
          // If induk unit kerja is available, filter by both instansi and induk unit kerja
          response = await axios.get(
            API_ENDPOINTS.getKategoriRisikoByInstansiAndIndukUnitKerja(
              idInstansi,
              idIndukUnitKerja,
            ),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        } else {
          // Otherwise, just filter by instansi
          response = await axios.get(
            API_ENDPOINTS.getKategoriRisikoAll(idInstansi),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }

        setKategoriRisiko(response.data);
      } catch (error) {
        const errorResponse =
          error.response?.data?.detail ||
          "Terjadi kesalahan. Silakan coba lagi.";
        setErrorMessage(errorResponse);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idInstansi, idIndukUnitKerja]);

  const handleActionClick = useCallback(
    (action, row) => {
      switch (action) {
        case "view":
          navigate(`/parameters/kategori-risiko/detail/${row.id}`);
          break;
        case "edit":
          navigate(`/parameters/kategori-risiko/edit/${row.id}`);
          break;
        case "delete":
          setSelectedKategoriRisiko(row);
          setShowModal(true);
          break;
        default:
          console.warn("Action tidak dikenali:", action);
      }
    },
    [navigate],
  );

  const handleDelete = async () => {
    if (!selectedKategoriRisiko) return;

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        showToast("error", "Token tidak tersedia.");
        return;
      }

      // Validate instansi ID before proceeding with delete
      const instansiValidation = await validateInstansiId(idInstansi, token);
      if (!instansiValidation.valid) {
        showToast("error", instansiValidation.message);
        return;
      }

      await axios.delete(
        API_ENDPOINTS.deleteKategoriRisiko(selectedKategoriRisiko.id),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("success", "Kategori Risiko berhasil dihapus!");
      setKategoriRisiko((prev) =>
        prev.filter((item) => item.id !== selectedKategoriRisiko.id),
      );
      setShowModal(false);
      setSelectedKategoriRisiko(null);
    } catch (error) {
      const errorResponse =
        error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
      showToast("error", errorResponse);
    }
  };

  const columns = useMemo(
    () => getKategoriRisikoColumns(handleActionClick, user),
    [handleActionClick, user],
  );
  if (loading || errorMessage) {
    return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
  }

  return (
    <>
      <div style={{ overflow: "visible" }}>
        <Table
          title="Data Kategori Risiko"
          data={kategoriRisiko}
          columns={columns}
        />
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedKategoriRisiko && (
            <>
              <h6 className="fw-bold">
                Apakah Anda yakin ingin menghapus data ini ?
              </h6>
              <p className="text-muted">Data akan dihapus secara permanen</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="justify-content-center">
          <Button
            variant="light-secondary"
            onClick={() => setShowModal(false)}
            className="px-4"
          >
            Batal
          </Button>
          <Button variant="danger" onClick={handleDelete} className="px-4">
            Iya
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default KategoriRisikoTabel;
