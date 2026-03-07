import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import BaganRisikoEditContent from '@/components/baganRisikoEdit/aganRisikoEditContent';

const BaganRisikoEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <BaganRisikoEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default BaganRisikoEdit


