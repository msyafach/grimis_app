import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom';

const KriteriaRisikoKemungkinanHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/kriteria-risiko/kemungkinan/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Kemungkinan</span>
                </Link>
            </div>
        </>
    )
}

export default KriteriaRisikoKemungkinanHeader