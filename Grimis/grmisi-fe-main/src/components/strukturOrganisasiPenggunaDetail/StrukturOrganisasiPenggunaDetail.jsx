import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import API_ENDPOINTS from '../../config/apiConfig';

const StrukturOrganisasiDetailPenggunaContent = ({ title = "Detail Pengguna Struktur Organisasi" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { strukturOrganisasiId, userId } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getUserById(userId), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(response.data);
            } catch (error) {
                const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
                setErrorMessage(errorResponse);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleBack = () => {
        navigate(`/parameters/struktur-organisasi/users/${strukturOrganisasiId}`);
    };

    if (isRemoved) return null;
    if (loading || errorMessage) {
        return <ContentLoaderWrapper loading={loading} error={errorMessage} />;
    }

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body">
                    <div className="d-flex justify-content-center align-items-center">
                        <div className="col-12">
                            <div className="row">
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Nama Depan</label>
                                        <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data.nama_depan} disabled />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Nama Belakang</label>
                                        <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data.nama_belakang} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Email</label>
                                        <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data.email} disabled />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Username</label>
                                        <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data.username} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Peran</label>
                                        <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data.role} disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                                <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack} >
                                    <FiArrowLeft size={16} className="me-2" />Kembali
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

StrukturOrganisasiDetailPenggunaContent.propTypes = {
    title: PropTypes.string
};

export default StrukturOrganisasiDetailPenggunaContent;
