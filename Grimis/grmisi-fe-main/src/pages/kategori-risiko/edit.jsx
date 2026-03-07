import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KategoriRisikoEditContent from '@/components/kategoriRisikoEdit/KategoriRisikoEditContent'
import Footer from '@/components/shared/Footer'

const KategoriRisikoEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KategoriRisikoEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KategoriRisikoEdit


