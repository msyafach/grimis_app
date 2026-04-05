import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Modal, Button } from "react-bootstrap";
import Table from "@/components/shared/table/Table";
import CardHeader from "@/components/shared/CardHeader";
import useCardTitleActions from "@/hooks/useCardTitleActions";
import { getColumns } from "./Columns";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import API_ENDPOINTS from "../../config/apiConfig";
import { validateInstansiId } from "@/utils/validateIds";
import { useInstansi } from "../../context/InstansiContext";
import { useAuth } from "../../context/AuthContext";
import { showToast } from "@/utils/toast";

const StrukturOrganisasiPenggunaTabel = () => {
  const { handleRefresh, handleExpand } = useCardTitleActions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { strukturOrganisasiId } = useParams();
  const [selectedStrukturOrganisasi, setSelectedStrukturOrganisasi] =
    useState(null);
  const { idInstansi } = useInstansi();
  const [dataStrukturOrganisasiPengguna, setDataStrukturOrganisasiPengguna] =
    useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const token = localStorage.getItem("access_token");

      // Validate instansi ID before proceeding
      const instansiValidation = await validateInstansiId(idInstansi, token);
      if (!instansiValidation.valid) {
        setErrorMessage(instansiValidation.message);
        setLoading(false);
        return;
      }

      const response = await axios.get(
        API_ENDPOINTS.getStrukturOrganisasiAssignUsers(strukturOrganisasiId),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setDataStrukturOrganisasiPengguna(response.data);
    } catch (error) {
      const errorResponse =
        error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
      setErrorMessage(errorResponse);
    } finally {
      setLoading(false);
    }
  }, [strukturOrganisasiId, idInstansi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchStrukturOrganisasiDetail = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          API_ENDPOINTS.getStrukturOrganisasiById(strukturOrganisasiId),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        setSelectedStrukturOrganisasi(response.data);
      } catch (error) {
        console.error("Gagal mengambil detail struktur organisasi:", error);
      }
    };

    fetchStrukturOrganisasiDetail();
  }, [strukturOrganisasiId]);

  const handleActionClick = useCallback(
    (action, row) => {
      switch (action) {
        case "view":
          navigate(
            `/parameters/struktur-organisasi/users/${strukturOrganisasiId}/detail/${row.id}`,
          );
          break;
        case "delete":
          setUserToDelete(row);
          setShowDeleteModal(true);
          break;
        default:
          console.warn("Action tidak dikenali:", action);
      }
    },
    [navigate, strukturOrganisasiId],
  );

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Remove user from structure
      const currentIds = dataStrukturOrganisasiPengguna.map((u) => u.id);
      const newIds = currentIds.filter((id) => id !== userToDelete.id);

      await axios.post(
        API_ENDPOINTS.postStrukturOrganisasiAssignUsers(strukturOrganisasiId),
        {
          user_ids: newIds,
        },
        { headers },
      );

      showToast(
        "success",
        "Pengelola Risiko berhasil dihapus dari unit kerja!",
      );
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      console.error("Error removing user:", error);
      showToast("error", "Gagal menghapus pengelola risiko.");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => getColumns(handleActionClick, user),
    [handleActionClick, user],
  );

  return (
    <ContentLoaderWrapper loading={loading} error={errorMessage}>
      {selectedStrukturOrganisasi && (
        <div className="card">
          <CardHeader
            title="Struktur Organisasi"
            refresh={handleRefresh}
            expanded={handleExpand}
          />
          <div className="col-12 bg-light p-4 rounded-4 mt-3 mb-3 mr-3">
            <p className="mb-0">
              <strong>Kode:</strong> {selectedStrukturOrganisasi.kode}
            </p>
            <p className="mb-0">
              <strong>Nama:</strong> {selectedStrukturOrganisasi.nama}
            </p>
            <p className="mb-0">
              <strong>Jenis:</strong> {selectedStrukturOrganisasi.jenis}
            </p>
          </div>
        </div>
      )}
      <Table
        title={"Data Pengelola Risiko Unit Kerja"}
        data={dataStrukturOrganisasiPengguna}
        columns={columns}
      />

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Penghapusan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {userToDelete && (
            <p>
              Apa Anda yakin ingin menghapus{" "}
              <strong>
                {userToDelete.nama_depan} {userToDelete.nama_belakang}
              </strong>{" "}
              dari unit kerja ini?
            </p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            disabled={loading}
          >
            {loading ? "..." : "Hapus"}
          </Button>
        </Modal.Footer>
      </Modal>
    </ContentLoaderWrapper>
  );
};

export default StrukturOrganisasiPenggunaTabel;
