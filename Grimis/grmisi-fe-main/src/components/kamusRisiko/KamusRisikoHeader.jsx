import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const KamusRisikoHeader = () => {
    const { user } = useAuth();

    // Admin roles can add directly, Pemilik/Pengelola Risiko can propose
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const isPemilikPengelola = user?.role === "PEMILIK_RISIKO" || user?.role === "PENGELOLA_RISIKO";
    const isAllowed = isAdmin || isPemilikPengelola;

    const buttonText = isAdmin ? "Tambah Kamus Risiko" : "Usulkan Kamus Risiko";

    return (
        <>
            {isAllowed && (
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link to="/parameters/kamus-risiko/tambah" className="btn btn-primary">
                        <FiPlus size={16} className='me-2' />
                        <span>{buttonText}</span>
                    </Link>
                </div>
            )}
        </>
    )
}

export default KamusRisikoHeader 