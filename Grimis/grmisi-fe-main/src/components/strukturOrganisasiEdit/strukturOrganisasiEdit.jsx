import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import PropTypes from "prop-types";
import { FiSave, FiArrowLeft } from "react-icons/fi";
import CardHeader from "@/components/shared/CardHeader";
import useCardTitleActions from "@/hooks/useCardTitleActions";
import { showToast } from "@/utils/toast";
import ContentLoaderWrapper from "../shared/ContentLoaderWrapper";
import FormUnitKerja from "./FormUnitKerja";
import { useInstansi } from "../../context/InstansiContext";
import API_ENDPOINTS from "../../config/apiConfig";
import { validateInstansiId } from "@/utils/validateIds";

const StrukturOrganisasiEditContent = ({
  title = "Edit Struktur Organisasi",
}) => {
  const { isRemoved, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();
  const navigate = useNavigate();
  const { idInstansi } = useInstansi();
  const { strukturOrganisasiId } = useParams();
  const [lokasiData, setLokasiData] = useState([]);
  const [selectedProvinsi, setSelectedProvinsi] = useState(null);
  const [selectedKota, setSelectedKota] = useState(null);
  const [formData, setFormData] = useState({
    kode: "",
    kode_induk: "",
    nama: "",
    nama_pendek: "",
    selera_risiko: 0,
    provinsi: "",
    pimpinan: "",
    jabatan_pimpinan: "",
    kota: "",
    id_induk_unit_kerja: "",
    id_instansi: idInstansi,
  });
  const [parentSeleraRisiko, setParentSeleraRisiko] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

      // Load location data
      const responseLokasi = await fetch("/data/ref_lokasi.json");
      const dataLokasi = await responseLokasi.json();
      setLokasiData(dataLokasi);
      const provinsiData = dataLokasi.map((prov) => ({
        label: String(prov.nama),
        value: String(prov.kode),
      }));

      // Get struktur organisasi data
      const response = await axios.get(
        API_ENDPOINTS.getStrukturOrganisasiById(strukturOrganisasiId),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const provinsiSelected = provinsiData.find(
        (prov) => prov.label === response.data.provinsi,
      );
      const filteredKota = provinsiSelected
        ? dataLokasi
            .find((p) => p.kode === provinsiSelected.value)
            ?.kotakab.map((kota) => ({
              label: kota.nama,
              value: kota.kode,
            })) || []
        : [];
      const kotaSelected = filteredKota.find(
        (kota) => kota.label === response.data.kota,
      );

      setFormData({
        kode: response.data.kode,
        kode_induk: response.data.kode_induk,
        nama_induk_unit: response.data.nama_induk_unit,
        nama: response.data.nama,
        nama_pendek: response.data.nama_pendek,
        selera_risiko: response.data.selera_risiko,
        provinsi: response.data.provinsi,
        pimpinan: response.data.pimpinan,
        jabatan_pimpinan: response.data.jabatan_pimpinan,
        kota: response.data.kota,
        id_induk_unit_kerja: response.data.id_induk_unit_kerja,
        id_instansi: response.data.id_instansi,
      });
      setSelectedProvinsi(provinsiSelected);
      setSelectedKota(kotaSelected);

      // Fetch parent unit's selera_risiko if parent exists
      if (response.data.kode_induk) {
        try {
          const allStructsRes = await axios.get(
            API_ENDPOINTS.getStrukturOrganisasibyInstansi(idInstansi),
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const parent = allStructsRes.data.find(
            (item) => item.kode === response.data.kode_induk,
          );
          if (parent) {
            setParentSeleraRisiko(parent.selera_risiko);
          }
        } catch (err) {
          console.warn("Failed to fetch parent's selera_risiko");
        }
      }
    } catch (error) {
      const errorResponse =
        error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
      setErrorMessage(errorResponse);
      showToast("error", errorResponse);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [strukturOrganisasiId, idInstansi]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update formData when idInstansi changes
  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState,
      id_instansi: idInstansi,
    }));
  }, [idInstansi]);

  const provinsiData = lokasiData.map((prov) => ({
    label: String(prov.nama),
    value: String(prov.kode),
  }));
  const filteredKota = selectedProvinsi
    ? lokasiData
        .find((p) => p.kode === selectedProvinsi.value)
        ?.kotakab.map((kota) => ({
          label: kota.nama,
          value: kota.kode,
        })) || []
    : [];

  const handleUnitKerjaChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    // Validate Selera Risiko against parent
    if (
      parentSeleraRisiko !== null &&
      Number(formData.selera_risiko) > parentSeleraRisiko
    ) {
      setLoading(false);
      showToast(
        "error",
        `Selera Risiko tidak boleh lebih tinggi dari Induk Unit Kerja (${parentSeleraRisiko})`,
      );
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      // Validate instansi ID before submitting
      const instansiValidation = await validateInstansiId(idInstansi, token);
      if (!instansiValidation.valid) {
        setErrorMessage(instansiValidation.message);
        setLoading(false);
        return;
      }

      // Create a clean version of formData
      const cleanFormData = {
        kode: formData.kode,
        kode_induk: formData.kode_induk || null,
        nama: formData.nama,
        nama_pendek: formData.nama_pendek,
        selera_risiko: Number(formData.selera_risiko),
        provinsi: formData.provinsi,
        pimpinan: formData.pimpinan || null,
        jabatan_pimpinan: formData.jabatan_pimpinan || null,
        kota: formData.kota || null,
        id_induk_unit_kerja: formData.id_induk_unit_kerja,
        id_instansi: formData.id_instansi,
      };

      await axios.put(
        API_ENDPOINTS.updateStrukturOrganisasi(strukturOrganisasiId),
        cleanFormData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("success", "Struktur Organisasi berhasil diperbarui!");
    } catch (error) {
      console.error("Full error:", error);
      const detail = error.response?.data?.detail;
      let errorMsg = "Terjadi kesalahan. Silakan coba lagi.";

      if (Array.isArray(detail)) {
        errorMsg = detail.map((d) => d.msg).join(", ");
      } else if (typeof detail === "string") {
        errorMsg = detail;
      }

      setErrorMessage(errorMsg);
      showToast("error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/parameters/struktur-organisasi");
  };

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
        <form onSubmit={handleSubmit}>
          <div className="card-body">
            <FormUnitKerja
              formData={formData}
              handleUnitKerjaChange={handleUnitKerjaChange}
              provinsiData={provinsiData}
              filteredKota={filteredKota}
              selectedProvinsi={selectedProvinsi}
              setSelectedProvinsi={setSelectedProvinsi}
              selectedKota={selectedKota}
              setSelectedKota={setSelectedKota}
            />
          </div>
          <div className="card-footer border-top d-flex justify-content-end p-3">
            <button
              className="btn btn-light-secondary me-2"
              type="button"
              onClick={handleBack}
            >
              <FiArrowLeft size={20} className="me-1" /> Kembali
            </button>
            <button className="btn btn-primary" type="submit">
              <FiSave size={20} className="me-1" /> Simpan
            </button>
          </div>
        </form>
      </ContentLoaderWrapper>
    </div>
  );
};

StrukturOrganisasiEditContent.propTypes = {
  title: PropTypes.string,
};

export default StrukturOrganisasiEditContent;
