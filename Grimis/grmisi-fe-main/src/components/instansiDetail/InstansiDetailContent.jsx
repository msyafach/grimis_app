import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const InstansiDetailContent = ({ title = "Detail Instansi" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
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

    if (isRemoved) return null;
    if (loading) {
        return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
    }

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <form>
                    {[
                        { label: "Nama Instansi", name: "nama_instansi", type: "text" },
                        { label: "Kode Instansi", name: "kode_instansi", type: "text" },
                        { label: "Jenis", name: "jenis", type: "text" },
                        { label: "Alamat", name: "alamat", type: "text" },
                        { label: "Telepon", name: "telepon", type: "text" },
                        { label: "Email", name: "email", type: "email" },
                    ].map(({ label, name, type }) => (
                        <div className="mb-4" key={name}>
                            <label className="form-label">
                                {label} <span className="text-danger">*</span>
                            </label>
                            <input
                                type={type}
                                className="form-control form-control-sm rounded-3 bg-light"
                                name={name}
                                value={formData[name]}
                                disabled
                            />
                        </div>
                    ))}
                </form>
            </div>
        </div>
    );
};

InstansiDetailContent.propTypes = {
    title: PropTypes.string
};

export default InstansiDetailContent;
