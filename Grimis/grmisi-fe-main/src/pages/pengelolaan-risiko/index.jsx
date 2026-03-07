import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import IdentifikasiRisikoHeader from '@/components/identifikasiRisiko/IdentifikasiRisikoHeader';
import IdentifikasiRisikoTabel from '@/components/identifikasiRisiko/IdentifikasiRisikoTabel';
import Footer from '@/components/shared/Footer';

const IdentifikasiRisikoIndex = () => {
    return (
        <>
            <PageHeader>
                <IdentifikasiRisikoHeader />
            </PageHeader>

            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className="mb-3">
                    {/* Tombol Kembali Pindah ke Atas Tabel */}
                    <Link to="/" className="btn btn-sm btn-light d-inline-flex align-items-cente">
                        <FiArrowLeft size={16} className='me-2' />
                        <span>Dashboard Peta Risiko</span>
                    </Link>
                </div>

                <div className='row'>
                    <IdentifikasiRisikoTabel />
                </div>
            </div>

            <Footer />
        </>
    )
}

export default IdentifikasiRisikoIndex;
