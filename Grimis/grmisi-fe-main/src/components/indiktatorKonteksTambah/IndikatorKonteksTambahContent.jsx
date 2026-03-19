import { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import FormIndikatorKonteks from './FormIndikatorKonteks';
import { useInstansi } from '../../context/InstansiContext';
import { useAuth } from '@/context/AuthContext';
import API_ENDPOINTS from '../../config/apiConfig';

setLanguage('id');

const IndikatorKonteksTambahContent = ({ title = "Tambah Indikator", resetKey }) => {
    const { user } = useAuth();
    const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_KLP";
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { konteksSasaranId } = useParams();
    const { idInstansi } = useInstansi();
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "id_konteks": "",
        "id_instansi": "",
        "status_approval": isAdmin ? "TERVERIFIKASI" : "MENUNGGU_VERIFIKASI",
    });

    const handleInputIndikatorKonteks = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
            id_konteks: konteksSasaranId,
            id_instansi: idInstansi,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postIndikator, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const successMessage = isAdmin ? "Indikator Berhasil Ditambahkan!" : "Usulan Indikator Berhasil Diajukan!";
            showToast("success", successMessage);
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };

    const handleBack = () => {
        navigate(`/parameters/konteks-sasaran/indikator/${konteksSasaranId}`);
    };

    if (isRemoved) return null;

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="col-12">
                            <form onSubmit={handleSubmit}>
                                <FormIndikatorKonteks
                                    formData={formData}
                                    setFormData={setFormData}
                                    handleInputIndikatorKonteks={handleInputIndikatorKonteks}
                                />
                                <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                    <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}><FiArrowLeft size={16} className="me-2" />Kembali</button>
                                    <button className="btn btn-primary" type="submit"><FiSave size={16} className="me-2" />Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div >
            </div >
        </>
    );
};

IndikatorKonteksTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};


export default IndikatorKonteksTambahContent;
