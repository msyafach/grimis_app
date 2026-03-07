import { FiArrowLeft, FiBarChart } from 'react-icons/fi';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const EvaluasiRisikoRtpHeader = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { state } = useLocation();
    const analisisId = state?.analisisId;

    const handleClick = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/evaluasi-risiko`, {
            state: { analisisId }
        });
    };

    const handleBack = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}`, {
            state: { analisisId }
        });
    };

    const isViewOnly = ["PEGAWAI", "PENGAWAS_INTERN", "UNIT_MANAJEMEN_RISIKO"].includes(user?.role);
    const buttonLabel = isViewOnly ? "Evaluasi Risiko" : "Kelola Evaluasi Risiko";

    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <button
                    type="button"
                    className="btn bg-soft-danger text-danger"
                    onClick={handleBack}
                >
                    <FiArrowLeft size={16} className="me-2" /> Kembali
                </button>
                <button
                    type="button"
                    className="btn bg-primary text-white"
                    onClick={handleClick}
                >
                    <FiBarChart size={16} className="me-2" /> {buttonLabel}
                </button>
            </div>
        </>
    );
}

export default EvaluasiRisikoRtpHeader;
