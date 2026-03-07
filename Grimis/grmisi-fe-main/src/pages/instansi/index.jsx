import PageHeader from '@/components/shared/pageHeader/PageHeader'
import InstansiHeader from '@/components/instansi/InstansiHeader';
import InstansiTabel from '@/components/instansi/InstansiTabel';
import Footer from '@/components/shared/Footer'

const Instansi = () => {
    return (
        <>
            <PageHeader>
                <InstansiHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <InstansiTabel />
            </div>
            <Footer />
        </>
    )
}

export default Instansi