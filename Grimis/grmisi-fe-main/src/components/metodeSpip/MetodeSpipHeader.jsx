import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi'

const MetodeSpipHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/parameters/metode-spip/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Metode SPIP</span>
                </Link>
            </div>
        </>
    )
}

export default MetodeSpipHeader 