import PageHeader from '@/components/shared/pageHeader/PageHeader'
import DashboardMatriksPetaRisiko from '@/components/petaRisiko/DashboardMatriksPetaRisiko'
import DashboardStats from '@/components/dashboard/DashboardStats'
import Footer from '@/components/shared/Footer'

const PetaRisikoIndex = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
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

export default PetaRisikoIndex