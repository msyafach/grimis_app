import React from 'react'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Footer from '@/components/shared/Footer'
import RegisterRisikoDetailContent from '@/components/registerRisikoDetail/RegisterRisikoContent'

const RegisterRisikoDetail = () => {
    return (
        <>
            <PageHeader>
            </PageHeader>
            <div className='main-content'>
                <div className='row'>
                    <RegisterRisikoDetailContent />
                </div>
            </div>
        </>
    )
}

export default RegisterRisikoDetail


