import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi'

const BaganRisikoHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/parameters/bagan-risiko/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Bagan Risiko</span>
                </Link>
            </div>
        </>
    )
}

export default BaganRisikoHeader 