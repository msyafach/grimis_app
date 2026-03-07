import PageHeader from '@/components/shared/pageHeader/PageHeader';
import AprrovalIdentifikasiRisikoTabel from '@/components/aprrovalIdentifikasiRisiko/AprrovalIdentifikasiRisikoTabel';
import Footer from '@/components/shared/Footer';

const ApprovalIdentifikasiRisikoIndex = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <AprrovalIdentifikasiRisikoTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ApprovalIdentifikasiRisikoIndex