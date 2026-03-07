import { FiArrowLeft, FiBarChart } from 'react-icons/fi';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const EvaluasiRisikoRtpDetailHeader = () => {
    const navigate = useNavigate();
    const { identifikasiId } = useParams();
    const { state } = useLocation();
    const analisisId = state?.analisisId;
    const from = state?.from;

    const handleBack = () => {
        if (from) {
            navigate(from, { state: { analisisId } });
        } else {
            navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}/rtp`, {
                state: { analisisId }
            });
        }
    };

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
            </div>
        </>
    );
}

export default EvaluasiRisikoRtpDetailHeader;
