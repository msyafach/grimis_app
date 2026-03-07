import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi'

const KamusRisikoHeader = () => {
    const navigate = useNavigate();
    const handleBack = () => {
        navigate(`/parameters/kamus-risiko`);
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
    )
}

export default KamusRisikoHeader