import PageHeader from '@/components/shared/pageHeader/PageHeader'
import ManajemenPenggunaHeader from '@/components/manajemenPengguna/ManajemenPenggunaHeader'
import ManajemenPenggunaTabel from '@/components/manajemenPengguna/ManajemenPenggunaTabel'
import Footer from '@/components/shared/Footer'

const ManajemenPengguna = () => {
    return (
        <>
            <PageHeader>
                <ManajemenPenggunaHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <ManajemenPenggunaTabel />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default ManajemenPengguna