import React from 'react'
import { FiBarChart, FiBriefcase, FiDollarSign, FiEye, FiFilter, FiFlag, FiPaperclip, FiPlus, FiUserCheck, FiUserMinus, FiUsers } from 'react-icons/fi'
import { BsFiletypeCsv, BsFiletypeExe, BsFiletypePdf, BsFiletypeTsx, BsFiletypeXml, BsPrinter } from 'react-icons/bs';
import Dropdown from '@/components/shared/Dropdown';
import { Link } from 'react-router-dom'

const ManajemenPenggunaHeader = () => {
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/settings-unit-kerja/manajemen-pengguna/tambah" className="btn btn-primary">
                    <FiPlus size={16} className='me-2' />
                    <span>Tambah Pengguna</span>
                </Link>
            </div>
        </>
    )
}

export default ManajemenPenggunaHeader