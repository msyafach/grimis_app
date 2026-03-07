import PageHeader from '@/components/shared/pageHeader/PageHeader'
import DashboardMatriksPetaRisiko from '@/components/petaRisiko/DashboardMatriksPetaRisiko'
import DashboardStats from '@/components/dashboard/DashboardStats'
import Footer from '@/components/shared/Footer'

const PetaRisiko = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <DashboardStats />
                    <div className="col-12">
                        <DashboardMatriksPetaRisiko />
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default PetaRisiko