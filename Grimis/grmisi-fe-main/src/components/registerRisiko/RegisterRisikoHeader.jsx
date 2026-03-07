import React from 'react'
import { FiPlus } from 'react-icons/fi'

import { Link } from 'react-router-dom';

const RegisterRisikoHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/pengelolaan-risiko/registrasi-risiko/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Pengelolaan Risiko</span>
                </Link>
            </div>
        </>
    )
}

export default RegisterRisikoHeader