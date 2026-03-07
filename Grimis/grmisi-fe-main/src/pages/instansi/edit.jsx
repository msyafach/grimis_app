import PageHeader from '@/components/shared/pageHeader/PageHeader'
import InstansiEditContent from '@/components/instansiEdit/InstansiEditContent'
import Footer from '@/components/shared/Footer'

const InstansiEdit = () => {
    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <InstansiEditContent />
            </div>
            <Footer />
        </>
    );
}

export default InstansiEdit;
