import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import BaganRisikoDetailContent from '@/components/baganRisikoDetail/BaganRisikoDetailContent';

const BaganRisikoDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <BaganRisikoDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default BaganRisikoDetail


