import PageHeader from '@/components/shared/pageHeader/PageHeader'
import AuditTrailContent from '@/components/auditTrail/AuditTrailContent'
import Footer from '@/components/shared/Footer'

const AuditTrail = () => {
    return (
        <>
            <PageHeader>
                <div className="container-fluid">
                    <div className="row align-items-center">
                        <div className="col">
                            <h4 className="fw-bold mb-0">Audit Trail</h4>
                            <p className="text-muted mb-0">Riwayat aktivitas sistem - seperti AWS CloudTrail</p>
                        </div>
                    </div>
                </div>
            </PageHeader>
            <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <AuditTrailContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default AuditTrail
