import PageHeader from '@/components/shared/pageHeader/PageHeader'
import PetaSettingHeader from '@/components/petaRisikoSetting/Header'
import DashboardMatriks from '@/components/petaRisikoSetting/DashboardMatriks'
import Footer from '@/components/shared/Footer'

const PetaRisikoSettingIndex = () => {
    return (
        <>
            <PageHeader >
                <PetaSettingHeader />
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <DashboardMatriks />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default PetaRisikoSettingIndex