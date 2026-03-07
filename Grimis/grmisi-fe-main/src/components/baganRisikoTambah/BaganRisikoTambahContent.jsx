import { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { useTranslate } from '@/utils/translate';
import FormBaganRisiko from './FormBaganRisiko';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';

const BaganRisikoTambahContent = ({ title = "Tambah Bagan Risiko", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();
    const [formData, setFormData] = useState({
        "kode": "",
        "nama": "",
        "deskripsi": "",
        "tahun": 0,
        "id_instansi": idInstansi,
        "id_induk_unit_kerja": idIndukUnitKerja,
    });
    const translate = useTranslate();

    const handleInput = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("access_token");
            await axios.post(API_ENDPOINTS.postBaganRisiko, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast("success", "Bagan Risiko Berhasil Ditambahkan!");
            resetKey((prevKey) => prevKey + 1);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
        }
    };

    const handleBack = () => {
        navigate('/parameters/bagan-risiko');
    };

    if (isRemoved) return null;

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <FormBaganRisiko
                        formData={formData}
                        handleInput={handleInput}
                    />
                    <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                        <button className="btn btn-primary" type="submit">
                            <FiSave size={16} className="me-2" />Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

BaganRisikoTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired
};

export default BaganRisikoTambahContent;
