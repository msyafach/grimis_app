import { useState, useEffect } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import useCardTitleActions from "@/hooks/useCardTitleActions";
import CardHeader from "@/components/shared/CardHeader";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import API_ENDPOINTS from "../../config/apiConfig";
import { validateInstansiId } from "@/utils/validateIds";
import { useInstansi } from "../../context/InstansiContext";

const StrukturOrganisasiDetailContent = ({
  title = "Detail Struktur Organisasi",
}) => {
  const { isRemoved, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();
  const { strukturOrganisasiId } = useParams();
  const { idInstansi } = useInstansi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
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
          API_ENDPOINTS.getStrukturOrganisasiById(strukturOrganisasiId),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setData(response.data);
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
  }, [strukturOrganisasiId, idInstansi]);

  if (isRemoved) return null;
  if (loading || errorMessage) {
    return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
  }

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
        {data && (
          <div className="card-body">
            <div className="d-flex justify-content-center align-items-center">
              <div className="col-xl-12">
                <h5 className="fw-bold">Unit Kerja</h5>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Kode</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.kode || ""}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Induk Unit Kerja</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.nama_induk_unit || "-"}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Nama</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.nama || ""}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Nama Pendek</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.nama_pendek || ""}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Pimpinan</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.pimpinan || ""}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Jabatan Pimpinan</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.jabatan_pimpinan || ""}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Selera Risiko</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.selera_risiko || ""}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Provinsi</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.provinsi || ""}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-4">
                      <label className="form-label">Kota</label>
                      <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={data.kota || ""}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ContentLoaderWrapper>
    </div>
  );
};

StrukturOrganisasiDetailContent.propTypes = {
  title: PropTypes.string,
};

export default StrukturOrganisasiDetailContent;
