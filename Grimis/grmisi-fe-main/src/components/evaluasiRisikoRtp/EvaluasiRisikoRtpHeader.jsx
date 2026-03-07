import { FiArrowLeft, FiBarChart, FiPlus } from 'react-icons/fi';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const EvaluasiRisikoRtpHeader = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { state } = useLocation();
    const analisisId = state?.analisisId;

    const handleNavigate = (action) => {
        switch (action) {
            case 'evaluasi':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/evaluasi-risiko`, {
                    state: { analisisId }
                });
                break;
            case 'tambah':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}/rtp/tambah`, {
                    state: { analisisId }
                });
                break;
            case 'back':
                navigate(`/pengelolaan-risiko/identifikasi-risiko/edit/${identifikasiId}`, {
                    state: { analisisId }
                });
                break;
            default:
                break;
        }
    };

    const isViewOnly = ["PEGAWAI", "PENGAWAS_INTERN", "UNIT_MANAJEMEN_RISIKO"].includes(user?.role);
    const buttonLabel = isViewOnly ? "Evaluasi Risiko" : "Kelola Evaluasi Risiko";

    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <button
                    type="button"
                    className="btn bg-soft-danger text-danger"
                    onClick={() => handleNavigate('back')}
                >
                    <FiArrowLeft size={16} className="me-2" /> Kembali
                </button>
                <button
                    type="button"
                    className="btn bg-primary text-white"
                    onClick={() => handleNavigate('tambah')}
                >
                    <FiPlus size={16} className="me-2" /> Tambah RTP
                </button>
                <button
                    type="button"
                    className="btn bg-primary text-white"
                    onClick={() => handleNavigate('evaluasi')}
                >
                    <FiBarChart size={16} className="me-2" /> {buttonLabel}
                </button>
            </div>
        </>
    );
}

export default EvaluasiRisikoRtpHeader;
