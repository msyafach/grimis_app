import PageHeader from '@/components/shared/pageHeader/PageHeader';
import IdentifikasiRisikoDetailHeader from '@/components/identifikasiRisikoDetail/Header';
import IdentifikasiRisikoDetailContent from '@/components/identifikasiRisikoDetail/Content';
import Footer from '@/components/shared/Footer'

const IdentifikasiRisikoDetail = () => {
    return (
        <>
            <PageHeader>
                <IdentifikasiRisikoDetailHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IdentifikasiRisikoDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default IdentifikasiRisikoDetail


