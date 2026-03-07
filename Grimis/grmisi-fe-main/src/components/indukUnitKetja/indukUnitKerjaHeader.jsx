import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const IndukUnitKerjaHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/organisasi/induk-unit-kerja/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Induk Unit Kerja</span>
                </Link>
            </div>
        </>
    )
}

export default IndukUnitKerjaHeader