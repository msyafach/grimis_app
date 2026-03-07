import { FiArrowLeft } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';

const TreatedRiskHeader = () => {
    const navigate = useNavigate();
    const { identifikasiId } = useParams();

    const handleBack = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}`);
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

export default TreatedRiskHeader;
