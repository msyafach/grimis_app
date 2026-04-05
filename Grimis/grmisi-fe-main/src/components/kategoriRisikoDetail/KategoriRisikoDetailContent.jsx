import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import CardHeader from "@/components/shared/CardHeader";
import useCardTitleActions from "@/hooks/useCardTitleActions";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import API_ENDPOINTS from "../../config/apiConfig";

const KategoriRisikoDetailContent = ({ title = "Detail Kategori Risiko" }) => {
  const { isRemoved, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();
  const { kategoriRisikoId } = useParams();
  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    id_instansi: "",
    id_induk_unit_kerja: "",
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        API_ENDPOINTS.getKategoriRisikoById(kategoriRisikoId),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setFormData({
        kode: response.data.kode,
        nama: response.data.nama,
        id_instansi: response.data.id_instansi,
        id_induk_unit_kerja: response.data.id_induk_unit_kerja,
      });
    } catch (error) {
      const errorResponse =
        error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
      setErrorMessage(errorResponse);
    } finally {
      setLoading(false);
    }
  }, [kategoriRisikoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isRemoved) return null;
  if (loading || errorMessage) {
    return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
  }

  return (
    <>
      <div className="card stretch stretch-full">
        <CardHeader
          title={title}
          refresh={handleRefresh}
          remove={handleDelete}
          expanded={handleExpand}
        />
        <div className="card-body">
          <div className="d-flex justify-content-center align-items-center">
            <div className="col-12">
              <form>
                {/* Form Fields */}
                <div className="row">
                  <div className="col-6">
                    <div className="mb-4">
                      <label className="form-label text-uppercase">
                        Kode <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light text-uppercase"
                        name="kode"
                        placeholder="Kode"
                        value={formData.kode}
                        disabled
                      />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-6">
                    <div className="mb-4">
                      <label className="form-label text-uppercase">
                        Nama <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="nama"
                        placeholder="Nama"
                        value={formData.nama}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

KategoriRisikoDetailContent.propTypes = {
  title: PropTypes.string,
};

export default KategoriRisikoDetailContent;
