import PageHeader from '@/components/shared/pageHeader/PageHeader';
import MetodeSpipHeader from '@/components/metodeSpip/MetodeSpipHeader';
import MetodeSpipTabel from '@/components/metodeSpip/MetodeSpipTabel';
import Footer from '@/components/shared/Footer';

const MetodeSpipIndex = () => {
    return (
        <>
            <PageHeader>
                <MetodeSpipHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <MetodeSpipTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default MetodeSpipIndex