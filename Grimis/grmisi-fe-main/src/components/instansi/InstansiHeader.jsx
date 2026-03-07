import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const InstansiHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/organisasi/instansi/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Instansi</span>
                </Link>
            </div>
        </>
    )
}

export default InstansiHeader