import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import axios from "axios";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { showToast } from "@/utils/toast";
import CardHeader from "@/components/shared/CardHeader";
import useCardTitleActions from "@/hooks/useCardTitleActions";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import API_ENDPOINTS from "../../config/apiConfig";

const StrukturOrganisasiPenggunaTambahContent = ({
  title = "Tambah Pengelola Risiko Unit Kerja",
  resetKey,
}) => {
  const { isRemoved, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();
  const navigate = useNavigate();
  const { strukturOrganisasiId } = useParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [strukturData, setStrukturData] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    nama_depan: "",
    nama_belakang: "",
    username: "",
    user_id: null, // Store ID if existing user
  });

  useEffect(() => {
    const fetchStruktur = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(
          API_ENDPOINTS.getStrukturOrganisasiById(strukturOrganisasiId),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setStrukturData(response.data);
      } catch (error) {
        console.error("Gagal mengambil data struktur:", error);
        setErrorMessage("Gagal mengambil data struktur organisasi.");
      } finally {
        setLoading(false);
      }
    };
    fetchStruktur();
  }, [strukturOrganisasiId]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextStep1 = async () => {
    if (!formData.email) {
      showToast("error", "Email wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        API_ENDPOINTS.checkEmail(formData.email),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data) {
        // User exists
        const user = response.data;
        setFormData({
          ...formData,
          nama_depan: user.nama_depan,
          nama_belakang: user.nama_belakang,
          username: user.username,
          user_id: user.id,
        });
        setIsExistingUser(true);
        setCurrentStep(3); // Skip step 2
        showToast(
          "info",
          "Pengguna sudah terdaftar dalam sistem. Informasi dasar akan digunakan secara otomatis.",
        );
      } else {
        // New user
        setIsExistingUser(false);
        setCurrentStep(2);
      }
    } catch (error) {
      console.error("Error checking email:", error);
      showToast("error", "Gagal memeriksa email.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep2 = () => {
    if (!formData.nama_depan || !formData.nama_belakang || !formData.username) {
      showToast("error", "Semua kolom wajib diisi!");
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };
      let userId = formData.user_id;

      if (!isExistingUser) {
        // Register new user
        const registerData = {
          nama_depan: formData.nama_depan,
          nama_belakang: formData.nama_belakang,
          email: formData.email,
          username: formData.username,
          role: "PENGELOLA_RISIKO",
          instansi_id: strukturData.id_instansi,
          induk_unit_kerja_ids: [strukturData.id_induk_unit_kerja],
          send_email: true,
        };

        await axios.post(API_ENDPOINTS.registerUser, registerData, { headers });

        // Fetch the new user to get their ID
        const checkRes = await axios.get(
          API_ENDPOINTS.checkEmail(formData.email),
          { headers },
        );
        userId = checkRes.data?.id;
      }

      // Assign to structure
      if (userId) {
        // Get current assigned users to keep them
        const currentUsersRes = await axios.get(
          API_ENDPOINTS.getStrukturOrganisasiAssignUsers(strukturOrganisasiId),
          { headers },
        );
        const currentUserIds = currentUsersRes.data.map((u) => u.id);

        if (!currentUserIds.includes(userId)) {
          await axios.post(
            API_ENDPOINTS.postStrukturOrganisasiAssignUsers(
              strukturOrganisasiId,
            ),
            {
              user_ids: [...currentUserIds, userId],
            },
            { headers },
          );
        }

        showToast(
          "success",
          "Pengelola Risiko Unit Kerja berhasil ditambahkan!",
        );
        navigate(
          `/parameters/struktur-organisasi/users/${strukturOrganisasiId}`,
        );
        if (resetKey) resetKey((prev) => prev + 1);
      } else {
        showToast("error", "Gagal mendapatkan ID pengguna.");
      }
    } catch (error) {
      console.error("Error during submission:", error);
      const msg = error.response?.data?.detail || "Terjadi kesalahan.";
      showToast("error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate(`/parameters/struktur-organisasi/users/${strukturOrganisasiId}`);
    } else if (currentStep === 3 && isExistingUser) {
      setCurrentStep(1);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isRemoved) return null;

  return (
    <div className="card shadow-sm border-0 mb-3">
      <CardHeader
        title={title}
        isRemoved={isRemoved}
        onRefresh={handleRefresh}
        onExpand={handleExpand}
        onRemove={handleDelete}
      />
      <ContentLoaderWrapper loading={loading} error={errorMessage}>
        <div className="card-body p-4">
          {/* Stepper Header */}
          <div className="d-flex justify-content-between mb-5">
            <div
              className={`text-center ${currentStep >= 1 ? "text-primary" : "text-muted"}`}
              style={{ flex: 1 }}
            >
              <div
                className={`rounded-circle border d-inline-flex align-items-center justify-content-center mb-2 ${currentStep >= 1 ? "bg-primary text-white border-primary" : ""}`}
                style={{ width: "30px", height: "30px" }}
              >
                1
              </div>
              <div className="small fw-bold">PENGECEKAN EMAIL</div>
            </div>
            <div
              className={`text-center ${currentStep >= 2 ? "text-primary" : "text-muted"}`}
              style={{ flex: 1 }}
            >
              <div
                className={`rounded-circle border d-inline-flex align-items-center justify-content-center mb-2 ${currentStep >= 2 ? "bg-primary text-white border-primary" : ""}`}
                style={{ width: "30px", height: "30px" }}
              >
                2
              </div>
              <div className="small fw-bold">INFORMASI DASAR</div>
            </div>
            <div
              className={`text-center ${currentStep >= 3 ? "text-primary" : "text-muted"}`}
              style={{ flex: 1 }}
            >
              <div
                className={`rounded-circle border d-inline-flex align-items-center justify-content-center mb-2 ${currentStep >= 3 ? "bg-primary text-white border-primary" : ""}`}
                style={{ width: "30px", height: "30px" }}
              >
                3
              </div>
              <div className="small fw-bold">SUBMIT DATA</div>
            </div>
          </div>

          {/* Step 1: Email Check */}
          {currentStep === 1 && (
            <div className="col-md-6 mx-auto">
              <div className="mb-4">
                <label className="form-label">
                  EMAIL <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  placeholder="Masukkan email pengelola risiko"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* Step 2: Information */}
          {currentStep === 2 && (
            <div className="col-md-6 mx-auto">
              <div className="mb-3">
                <label className="form-label">
                  NAMA DEPAN <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="nama_depan"
                  value={formData.nama_depan}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  NAMA BELAKANG <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="nama_belakang"
                  value={formData.nama_belakang}
                  onChange={handleInputChange}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  NAMA PENGGUNA / USERNAME{" "}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* Step 3: Summary/Submit */}
          {currentStep === 3 && (
            <div className="col-md-6 mx-auto">
              {isExistingUser && (
                <div className="alert alert-warning mb-4">
                  <div className="d-flex gap-2">
                    <div
                      className="bg-warning text-white rounded-circle d-flex align-items-center justify-content-center"
                      style={{ minWidth: "24px", height: "24px" }}
                    >
                      i
                    </div>
                    <small>
                      Pengelola Risiko sudah terdaftar dalam system dengan
                      instansi yang berbeda. Dengan submit akan didaftarkan
                      secara langsung ke dalam instansi ini.
                    </small>
                  </div>
                </div>
              )}
              <div className="bg-light p-4 rounded-4 mb-4">
                <h6 className="fw-bold mb-3">INFORMASI PENGGUNA</h6>
                <p className="mb-1">
                  <strong>Nama:</strong> {formData.nama_depan}{" "}
                  {formData.nama_belakang}
                </p>
                <p className="mb-1">
                  <strong>Email:</strong> {formData.email}
                </p>
                <p className="mb-1">
                  <strong>Username:</strong> {formData.username}
                </p>
                <p className="mb-0">
                  <strong>Role:</strong> Pengelola Risiko
                </p>
              </div>
              <p className="text-center">
                Klik <strong>Selesai</strong> untuk memproses data.
              </p>
            </div>
          )}
        </div>

        <div className="card-footer border-top d-flex justify-content-between p-3">
          <button
            className="btn bg-soft-danger text-danger"
            type="button"
            onClick={handleBack}
          >
            <FiArrowLeft size={16} className="me-2" />
            Kembali
          </button>

          {currentStep === 1 && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleNextStep1}
              disabled={loading}
            >
              Selanjutnya <FiArrowRight size={16} className="ms-2" />
            </button>
          )}

          {currentStep === 2 && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleNextStep2}
            >
              Selanjutnya <FiArrowRight size={16} className="ms-2" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleSubmit}
              disabled={loading}
            >
              <FiCheck size={16} className="me-2" /> Selesai
            </button>
          )}
        </div>
      </ContentLoaderWrapper>
    </div>
  );
};

StrukturOrganisasiPenggunaTambahContent.propTypes = {
  title: PropTypes.string,
  resetKey: PropTypes.func,
};

export default StrukturOrganisasiPenggunaTambahContent;
