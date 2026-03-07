import PageHeader from '@/components/shared/pageHeader/PageHeader'
import IndukUnitKerjaDetailContent from '@/components/indukUnitKerjaDetail/IndukUnitKerjaDetailContent';
import BackButton from '@/components/shared/button/BackButton';
import Footer from '@/components/shared/Footer'

const IndukUnitKerjaDetail = () => {
    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <BackButton to="/organisasi/induk-unit-kerja" />
                    <IndukUnitKerjaDetailContent />
                </div>
            </div>
            <Footer />
        </>
    );
}

export default IndukUnitKerjaDetail;
