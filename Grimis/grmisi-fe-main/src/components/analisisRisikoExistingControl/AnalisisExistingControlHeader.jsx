import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

const AnalisisExistingControlHeader = ({ onUploadSuccess }) => {
    const navigate = useNavigate();
    const { identifikasiId } = useParams();

    const handleBack = () => {
        navigate(`/pengelolaan-risiko/identifikasi-risiko/detail/${identifikasiId}`);
    };

    return (
        <>
            <div className="d-flex align-items-center justify-content-between">
                <button type="button" className="btn bg-soft-danger text-danger" onClick={handleBack}>
                    <FiArrowLeft size={16} className="me-2" />
                    Kembali
                </button>
            </div>
        </>
    );
};

export default AnalisisExistingControlHeader;
