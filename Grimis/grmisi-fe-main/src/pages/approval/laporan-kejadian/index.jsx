import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import LaporanKejadianAdmin from '../../../pages/laporan-kejadian/LaporanKejadianAdmin';

const LaporanKejadianIndex = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <LaporanKejadianAdmin />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default LaporanKejadianIndex 