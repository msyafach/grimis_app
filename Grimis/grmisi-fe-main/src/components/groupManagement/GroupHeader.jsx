import { FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const GroupHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/groups/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Group</span>
                </Link>
            </div>
        </>
    )
}

export default GroupHeader
