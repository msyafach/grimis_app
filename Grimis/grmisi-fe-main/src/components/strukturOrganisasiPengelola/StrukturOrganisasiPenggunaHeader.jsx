import { useParams, Link } from "react-router-dom";
import { FiPlus, FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";

const StrukturOrganisasiPenggunaHeader = () => {
  const { strukturOrganisasiId } = useParams();
  const { user } = useAuth();
  const isAllowed =
    user?.role !== "PEGAWAI" && user?.role !== "PENGAWAS_INTERN";

  return (
    <>
      <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
        <Link
          to={`/parameters/struktur-organisasi`}
          className="btn bg-soft-danger text-danger"
        >
          <FiArrowLeft size={16} className="me-2" />
          <span>Kembali</span>
        </Link>
        {isAllowed && (
          <Link
            to={`/parameters/struktur-organisasi/users/${strukturOrganisasiId}/tambah`}
            className="btn btn-primary"
          >
            <FiPlus size={16} className="me-2" />
            <span>Tambah Pengelola Risiko Unit Kerja</span>
          </Link>
        )}
      </div>
    </>
  );
};

export default StrukturOrganisasiPenggunaHeader;
