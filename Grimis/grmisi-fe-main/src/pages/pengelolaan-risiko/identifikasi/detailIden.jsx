import PageHeader from '@/components/shared/pageHeader/PageHeader';
import IdentifikasiRisikoDetailIdenHeader from '@/components/identifikasiRisikoDetailIden/Header';
import IdentifikasiRisikoDetailIdenContent from '@/components/identifikasiRisikoDetailIden/Content';
import Footer from '@/components/shared/Footer'

const IdentifikasiRisikoDetailIden = () => {
    return (
        <>
            <PageHeader>
                <IdentifikasiRisikoDetailIdenHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IdentifikasiRisikoDetailIdenContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default IdentifikasiRisikoDetailIden


