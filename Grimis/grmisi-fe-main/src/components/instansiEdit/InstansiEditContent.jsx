import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const InstansiEditContent = ({ title = "Edit Instansi" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { instansiId } = useParams();
    const [formData, setFormData] = useState({
        nama_instansi: '',
        kode_instansi: '',
        jenis: '',
        alamat: '',
        telepon: '',
        email: ''
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchUserData = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getInstansiById(instansiId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            setFormData({
                nama_instansi: response.data.nama_instansi,
                kode_instansi: response.data.kode_instansi,
                jenis: response.data.jenis,
                alamat: response.data.alamat,
                telepon: response.data.telepon,
                email: response.data.email,
            });
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            setErrorMessage(errorResponse);
        } finally {
            setLoading(false);
        }
    }, [instansiId]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleInputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");
        try {
            const token = localStorage.getItem('access_token');
            await axios.put(API_ENDPOINTS.updateInstansi(instansiId), formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchUserData();
            showToast('success', 'Instansi Berhasil Diperbarui!');
        } catch (error) {
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            showToast("error", errorResponse);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/organisasi/instansi');
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label">Nama Instansi <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="nama_instansi"
                            placeholder="Nama Instansi"
                            value={formData.nama_instansi}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Kode Instansi <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="kode_instansi"
                            placeholder="Kode Instansi"
                            value={formData.kode_instansi}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Jenis <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="jenis"
                            placeholder="Jenis"
                            value={formData.jenis}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Alamat <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="alamat"
                            placeholder="Alamat"
                            value={formData.alamat}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Telepon <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="telepon"
                            placeholder="Telepon"
                            value={formData.telepon}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Email <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            className="form-control form-control-sm rounded-3"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

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

InstansiEditContent.propTypes = {
    title: PropTypes.string
};

export default InstansiEditContent;
