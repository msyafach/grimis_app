import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ManajemenPenggunaDetailContent from '@/components/manajemenPenggunaDetail/ManajemenPenggunaDetailContent';
import Footer from '@/components/shared/Footer'

const ManajemenPenggunaDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ManajemenPenggunaDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ManajemenPenggunaDetail