import PageHeader from '@/components/shared/pageHeader/PageHeader'
import JenisPenyebabDetailHeader from '@/components/jenisPenyebabDetail/JenisPenyebabDetailHeader';
import JenisPenyebabDetailContent from '@/components/jenisPenyebabDetail/JenisPenyebabDetailContent';
import Footer from '@/components/shared/Footer'

const JenisPenyebabDetail = () => {
    return (
        <>
            <PageHeader>
                <JenisPenyebabDetailHeader />
            </PageHeader>
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <JenisPenyebabDetailContent />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default JenisPenyebabDetail;
