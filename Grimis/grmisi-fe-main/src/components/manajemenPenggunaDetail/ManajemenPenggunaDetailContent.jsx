import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FiArrowLeft } from 'react-icons/fi';
import { translate, setLanguage } from '@/utils/i18n';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getRoleLabel } from '../../utils/roleUtils';

setLanguage('id');

const roles = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Admin KLP", value: "ADMIN_KLP" },
    { label: "Unit Manajemen Risiko", value: "UNIT_MANAJEMEN_RISIKO" },
    { label: "Pemilik Risiko", value: "PEMILIK_RISIKO" },
    { label: "Pengelola Risiko", value: "PENGELOLA_RISIKO" },
    { label: "Pengawas Intern", value: "PENGAWAS_INTERN" },
    { label: "Pegawai", value: "PEGAWAI" },
];

const ManajemenPenggunaDetailContent = ({ title = "Detail Pengguna" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { userId } = useParams();
    const [selectedRole, setSelectedRole] = useState(null);
    const [formData, setFormData] = useState({
        nama_depan: '',
        nama_belakang: '',
        username: '',
        email: '',
        password: '',
        role: '',
        instansi_id: '',
        instansi_nama: '',
        induk_unit_kerja_ids: [],
        induk_unit_kerja_names: []
    });
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getUserById(userId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            const userData = response.data;
            
            // Initialize form data with user information
            const updatedFormData = {
                nama_depan: userData.nama_depan || '',
                nama_belakang: userData.nama_belakang || '',
                username: userData.username || '',
                email: userData.email || '',
                role: userData.role || '',
                instansi_id: userData.instansi_id || '',
                instansi_nama: userData.nama_instansi || '',
                induk_unit_kerja_ids: userData.induk_unit_kerja_ids || [],
                induk_unit_kerja_names: []
            };
            
            // Set role label
            setSelectedRole({ 
                label: getRoleLabel(userData.role), 
                value: userData.role 
            });
            
            // If user has instansi_id and it's not a SUPER_ADMIN, fetch induk unit kerja names
            if (userData.instansi_id && userData.role !== "SUPER_ADMIN" && userData.induk_unit_kerja_ids?.length > 0) {
                try {
                    const indukResponse = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(userData.instansi_id), {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    
                    // Map induk unit kerja IDs to their names
                    const indukUnitKerjaMap = new Map(
                        indukResponse.data.map(unit => [unit.id, unit.nama_induk_unit])
                    );
                    
                    updatedFormData.induk_unit_kerja_names = userData.induk_unit_kerja_ids
                        .map(id => indukUnitKerjaMap.get(id))
                        .filter(name => name); // Filter out any undefined values
                } catch (error) {
                    console.error("Error fetching induk unit kerja:", error);
                }
            }
            
            setFormData(updatedFormData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching user data:", error);
            const errorResponse = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorResponse);
            setErrorMessage(translatedError);
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const handleBack = () => {
        navigate('/settings-unit-kerja/manajemen-pengguna');
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

                <form >
                    <div className="mb-4">
                        <label className="form-label">Nama Depan <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="nama_depan"
                            placeholder="Nama Depan"
                            value={formData.nama_depan}
                            disabled
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Nama Belakang <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="nama_belakang"
                            placeholder="Nama Belakang"
                            value={formData.nama_belakang}
                            disabled
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Username <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="username"
                            placeholder="Username"
                            value={formData.username}
                            disabled
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Email <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            disabled
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="form-label">Pilih Peran <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="role"
                            placeholder="Peran"
                            value={selectedRole ? selectedRole.label : ''}
                            disabled
                        />
                    </div>

                    {formData.role && formData.role !== "SUPER_ADMIN" && (
                        <>
                            <div className="mb-4">
                                <label className="form-label">Instansi</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4 bg-light"
                                    value={formData.instansi_nama}
                                    disabled
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Induk Unit Kerja</label>
                                {formData.induk_unit_kerja_names.length > 0 ? (
                                    <div className="p-3 bg-light rounded-4">
                                        <ul className="list-group list-group-flush">
                                            {formData.induk_unit_kerja_names.map((unitName, index) => (
                                                <li key={index} className="list-group-item bg-light px-0 py-1">
                                                    {unitName}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        value="Tidak ada induk unit kerja yang ditetapkan"
                                        disabled
                                    />
                                )}
                            </div>
                        </>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

ManajemenPenggunaDetailContent.propTypes = {
    title: PropTypes.string
};

export default ManajemenPenggunaDetailContent;
