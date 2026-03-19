import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiPlus } from 'react-icons/fi'
import { useAuth } from "../../context/AuthContext";

const IndikatorHeader = () => {
    const { konteksSasaranId, konteksProbisId } = useParams();
    const { user } = useAuth();
    const isPegawaiOrPengawas = user?.role == "PEGAWAI" || user?.role == "PENGAWAS_INTERN";

    // Admin roles can add directly, Pemilik/Pengelola Risiko can propose
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";

    return (
        <>
            {konteksSasaranId && (
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link to={`/parameters/konteks-sasaran`} className="btn bg-soft-danger text-danger">
                        <FiArrowLeft size={16} className='me-2' />
                        <span>Kembali</span>
                    </Link>
                    {!isPegawaiOrPengawas && (
                        <Link to={`/parameters/konteks-sasaran/indikator/${konteksSasaranId}/tambah`} className="btn btn-primary">
                            <FiPlus size={16} className='me-2' />
                            <span>{isAdmin ? "Tambah Indikator Sasaran" : "Usulkan Indikator Sasaran"}</span>
                        </Link>
                    )}
                </div>
            )}

            {konteksProbisId && (
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link to={`/parameters/konteks-probis`} className="btn bg-soft-danger text-danger">
                        <FiArrowLeft size={16} className='me-2' />
                        <span>Kembali</span>
                    </Link>
                    {!isPegawaiOrPengawas && (
                        <Link to={`/parameters/konteks-probis/indikator/${konteksProbisId}/tambah`} className="btn btn-primary">
                            <FiPlus size={16} className='me-2' />
                            <span>{isAdmin ? "Tambah Indikator Probis" : "Usulkan Indikator Probis"}</span>
                        </Link>
                    )}
                </div>
            )}
        </>
    )
}

export default IndikatorHeader