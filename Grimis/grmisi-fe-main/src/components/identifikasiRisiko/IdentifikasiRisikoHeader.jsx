import { Link } from 'react-router-dom';
import { FiPlus, FiArrowLeft } from 'react-icons/fi'; // Menambahkan FiArrowLeft untuk ikon kembali
import { useAuth } from "../../context/AuthContext";

const IdentifikasiRisikoHeader = () => {
    const { user } = useAuth();
    const isAllowed = user?.role !== "PEGAWAI" && user?.role !== "PENGAWAS_INTERN";

    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                {/* Tombol Kembali ke Dashboard */}
                {/* 
                <Link to="/" className="btn btn-light">
                    <FiArrowLeft size={16} className='me-2' />
                    <span>Dashboard Peta Risiko</span>
                </Link>
                */}

                {/* Tombol Tambah Identifikasi Risiko (bersyarat) */}
                {isAllowed && (
                    <Link to="/pengelolaan-risiko/identifikasi-risiko/tambah" className="btn btn-primary">
                        <FiPlus size={16} className='me-2' />
                        <span>Tambah Identifikasi Risiko</span>
                    </Link>
                )}
            </div>
        </>
    )
}

export default IdentifikasiRisikoHeader;