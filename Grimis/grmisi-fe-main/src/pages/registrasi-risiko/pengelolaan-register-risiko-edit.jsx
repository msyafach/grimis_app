import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import RegisterRisikoEditContent from '@/components/registerRisikoEdit/RegisterRisikoEditContent'
import Footer from '@/components/shared/Footer'

const RegisterRisikoEdit = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className="main-content" style={{ minHeight: 'calc(100vh - 60px)' }}>
                <div className='row'>
                    <RegisterRisikoEditContent />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default RegisterRisikoEdit


