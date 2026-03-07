import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import RegisterRisikoHeader from '@/components/registerRisiko/RegisterRisikoHeader'
import RegisterRisikoTabel from '@/components/registerRisiko/RegisterRisikoTabel'

const RegisterRisiko = () => {
    return (
        <>
            <PageHeader>
                <RegisterRisikoHeader />
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <RegisterRisikoTabel />
                </div>
            </div>
        </>
    )
}

export default RegisterRisiko


