import PageHeader from '@/components/shared/pageHeader/PageHeader'
import StrukturOrganisasiDetailContent from '@/components/strukturOrganisasiDetail/StrukturOrganisasiDetail'
import StrukturOrganisasiDetailHeader from '@/components/strukturOrganisasiDetail/StrukturOrganisasiDetailHeader'
import Footer from '@/components/shared/Footer'

const StrukturOrganisasiDetail = () => {

    return (
        <>
            <PageHeader>
                <StrukturOrganisasiDetailHeader />
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <StrukturOrganisasiDetailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default StrukturOrganisasiDetail


