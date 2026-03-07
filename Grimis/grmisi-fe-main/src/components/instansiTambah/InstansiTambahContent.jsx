import { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import { showToast } from '@/utils/toast';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const InstansiTambahContent = ({ title = "Tambah Instansi", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nama_instansi: '',
        kode_instansi: '',
        jenis: '',
        alamat: '',
        telepon: '',
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleInputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.post(API_ENDPOINTS.postInstansi, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            // Get the new instansi ID
            // const newInstansiId = response.data?.id;
            // if (newInstansiId) {
            //     // Update localStorage with the new instansi
            //     localStorage.setItem('id_instansi', newInstansiId);
                
            //     // Update user preferences on the server
            //     try {
            //         await axios.put(
            //             API_ENDPOINTS.putUserPreferences(newInstansiId, null),
            //             {},
            //             { headers: { Authorization: `Bearer ${token}` } }
            //         );
            //         console.log("User preferences updated with new instansi");
            //     } catch (prefErr) {
            //         console.warn("Failed to update user preferences:", prefErr);
            //     }
                
            //     // Trigger context refresh by checking work unit - this helps establish proper context
            //     try {
            //         await axios.post(
            //             API_ENDPOINTS.checkWorkUnit,
            //             {},
            //             { headers: { Authorization: `Bearer ${token}` } }
            //         );
            //         console.log("Check work unit completed successfully");
            //     } catch (checkErr) {
            //         console.warn("Check work unit call failed:", checkErr);
            //     }
            // }
            
            showToast("success", "Instansi Berhasil Ditambahkan!");
            
            // Use a short timeout to allow backend processes to complete
            setTimeout(() => {
                navigate('/organisasi/instansi');
                window.location.reload();
            }, 1000);
            
            resetKey((prevKey) => prevKey + 1);
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
    if (loading) {
        return (
            <ContentLoaderWrapper loading={loading} error={errorMessage} />
        );
    }

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <div className="d-flex justify-content-center">
                        <div className="col-12">
                            <form onSubmit={handleSubmit}>
                                {[
                                    { label: 'Nama Instansi', name: 'nama_instansi', type: 'text' },
                                    { label: 'Kode Instansi', name: 'kode_instansi', type: 'text' },
                                    { label: 'Jenis', name: 'jenis', type: 'text' },
                                    { label: 'Alamat', name: 'alamat', type: 'text' },
                                    { label: 'Telepon', name: 'telepon', type: 'text' },
                                    { label: 'Email', name: 'email', type: 'email' },
                                ].map(({ label, name, type }) => (
                                    <div className="mb-4" key={name}>
                                        <label className="form-label">
                                            {label} <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type={type}
                                            name={name}
                                            className="form-control form-control-sm rounded-3"
                                            placeholder={label}
                                            value={formData[name]}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                ))}

                                <div className="d-flex justify-content-end gap-2 mt-4">
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
                </div>
            </div>
        </>
    );
};

InstansiTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default InstansiTambahContent;
