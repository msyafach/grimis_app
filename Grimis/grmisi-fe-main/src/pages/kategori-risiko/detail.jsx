import PageHeader from '@/components/shared/pageHeader/PageHeader'
import KategoriRisikoDetailHeader from '@/components/kategoriRisikoDetail/KategoriRisikoDetailHeader';
import KategoriRisikoDetailContent from '@/components/kategoriRisikoDetail/KategoriRisikoDetailContent';
import Footer from '@/components/shared/Footer'

const KategoriRisikoDetail = () => {
    return (
        <>
            <PageHeader>
                <KategoriRisikoDetailHeader />
            </PageHeader>
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KategoriRisikoDetailContent />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default KategoriRisikoDetail;
