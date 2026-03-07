import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi'

const KategoriRisikoDetailHeader = () => {

    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to={`/parameters/kategori-risiko`} className="btn bg-soft-danger text-danger">
                    <FiArrowLeft size={16} className='me-2' />
                    <span>Kembali</span>
                </Link>
            </div >
        </>
    )
}

export default KategoriRisikoDetailHeader