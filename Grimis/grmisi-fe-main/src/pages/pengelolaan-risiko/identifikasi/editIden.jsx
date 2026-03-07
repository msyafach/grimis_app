import PageHeader from '@/components/shared/pageHeader/PageHeader';
import IdentifikasiRisikoEditContent from '@/components/identifikasiRisikoEditIden/Content';
import Footer from '@/components/shared/Footer'

const IdentifikasiRisikoEditIden = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <IdentifikasiRisikoEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default IdentifikasiRisikoEditIden


