import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const KonteksProbisHeader = () => {
    const { user } = useAuth();
    const isAllowed = user?.role !== "PEGAWAI" && user?.role !== "PENGAWAS_INTERN";

    return (
        <>
            {isAllowed && (
                <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                    <Link to="/parameters/konteks-probis/tambah" className="btn btn-primary">
                        <FiPlus size={16} className='me-2' />
                        <span>Tambah Konteks Probis</span>
                    </Link>
                    {/*
                <Link to="/parameters/konteks-probis/tambah" className="btn btn-primary">
                    <FiShare size={16} className='me-2' />
                    <span>Import Data</span>
                </Link>
                <Link to="/parameters/konteks-probis/tambah" className="btn btn-primary">
                    <FiDownload size={16} className='me-2' />
                    <span>Download Template</span>
                </Link>
                */}
                </div>
            )}
        </>
    )
}

export default KonteksProbisHeader