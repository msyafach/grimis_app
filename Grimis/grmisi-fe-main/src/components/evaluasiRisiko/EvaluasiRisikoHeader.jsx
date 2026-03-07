import React from 'react'
import { FiPlus } from 'react-icons/fi'

import { Link } from 'react-router-dom';

const EvaluasiRisikoHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/pengendalian-risiko/evaluasi-risiko/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Pengendalian Risiko</span>
                </Link>
            </div>
        </>
    )
}

export default EvaluasiRisikoHeader