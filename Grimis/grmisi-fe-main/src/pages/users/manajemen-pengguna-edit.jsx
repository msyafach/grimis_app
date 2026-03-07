import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ManajemenPenggunaEditContent from '@/components/manajemenPenggunaEdit/ManajemenPenggunaEditContent'
import Footer from '@/components/shared/Footer'

const ManajemenPenggunaEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ManajemenPenggunaEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ManajemenPenggunaEdit