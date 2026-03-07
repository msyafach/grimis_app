import PageHeader from '@/components/shared/pageHeader/PageHeader';
import IdentifikasiRisikoEditHeader from '@/components/identifikasiRisikoEdit/Header';
import IdentifikasiRisikoEditContent from '@/components/identifikasiRisikoEdit/Content';
import Footer from '@/components/shared/Footer'

const IdentifikasiRisikoEdit = () => {
    return (
        <>
            <PageHeader>
                <IdentifikasiRisikoEditHeader />
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

export default IdentifikasiRisikoEdit


