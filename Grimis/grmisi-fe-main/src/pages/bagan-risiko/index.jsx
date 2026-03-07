import PageHeader from '@/components/shared/pageHeader/PageHeader';
import BaganRisikoHeader from '@/components/baganRisiko/BaganRisikoHeader';
import BaganRisikoTabel from '@/components/baganRisiko/BaganRisikoTabel';
import Footer from '@/components/shared/Footer';

const BaganRisikoIndex = () => {
    return (
        <>
            <PageHeader>
                <BaganRisikoHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <BaganRisikoTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default BaganRisikoIndex