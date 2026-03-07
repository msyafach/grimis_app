import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiDetailPenggunaContent from '@/components/strukturOrganisasiPenggunaDetail/StrukturOrganisasiPenggunaDetail';
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiPenggunaDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiDetailPenggunaContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasiPenggunaDetail


