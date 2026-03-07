import PageHeader from '@/components/shared/pageHeader/PageHeader'
import InstansiDetailContent from '@/components/instansiDetail/InstansiDetailContent';
import BackButton from '@/components/shared/button/BackButton';
import Footer from '@/components/shared/Footer'

const InstansiDetail = () => {
    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <BackButton to="/organisasi/instansi" />
                <InstansiDetailContent />
            </div>
            <Footer />
        </>
    );
}

export default InstansiDetail;
