import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import KamusRisikoApproval from './KamusRisikoApproval';

const KamusRisikoApprovalIndex = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <KamusRisikoApproval />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default KamusRisikoApprovalIndex
