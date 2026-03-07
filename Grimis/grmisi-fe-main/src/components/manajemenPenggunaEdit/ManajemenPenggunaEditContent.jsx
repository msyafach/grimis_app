import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FiEye, FiEyeOff, FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import SelectDropdown from '@/components/shared/SelectDropdown';
import MultiSelectDropdown from '@/components/shared/MultiSelectDropdown';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getRoleLabel } from '../../utils/roleUtils';

setLanguage('id');

const roles = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Admin Organisasi", value: "ADMIN_KLP" },
    { label: "Unit Manajemen Risiko", value: "UNIT_MANAJEMEN_RISIKO" },
    { label: "Pemilik Risiko", value: "PEMILIK_RISIKO" },
    { label: "Pengelola Risiko", value: "PENGELOLA_RISIKO" },
    { label: "Pengawas Intern", value: "PENGAWAS_INTERN" },
    { label: "Pegawai", value: "PEGAWAI" },
];

const ManajemenPenggunaEditContent = ({ title = "Edit Pengguna", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
    const { userId } = useParams();
    
    const [formData, setFormData] = useState({
        nama_depan: '',
        nama_belakang: '',
        username: '',
        email: '',
        password: '',
        role: '',
        instansi_id: '',
        induk_unit_kerja_ids: []
    });

    const [passwordError, setPasswordError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [instansiList, setInstansiList] = useState([]);
    const [indukUnitKerjaList, setIndukUnitKerjaList] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState("");
    const [currentUserInstansiId, setCurrentUserInstansiId] = useState("");
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [allIndukUnitKerjaIds, setAllIndukUnitKerjaIds] = useState([]);
    const [originalRole, setOriginalRole] = useState("");

    // Fetch current user info
    useEffect(() => {
        const fetchCurrentUser = async () => {
            if (!userId) {
                setErrorMessage("ID pengguna tidak valid");
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCurrentUserRole(response.data.role);
                setCurrentUserInstansiId(response.data.instansi_id);
                setIsSuperAdmin(response.data.role === "SUPER_ADMIN");
                
                // After getting current user info, fetch user data
                await fetchUserData(response.data.role, response.data.instansi_id);
            } catch (error) {
                setErrorMessage("Gagal memuat data pengguna saat ini");
                setLoading(false);
            }
        };

        fetchCurrentUser();
    }, [userId]);

    const fetchUserData = useCallback(async (currentRole, currentInstansiId) => {
        if (!userId) {
            setErrorMessage("ID pengguna tidak valid");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getUserById(userId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            const userData = response.data;
            
            // Check if user data is valid
            if (!userData) {
                setErrorMessage("Data pengguna tidak ditemukan");
                setLoading(false);
                return;
            }
            
            // Check if ADMIN_KLP is trying to edit a user from a different instansi
            if (currentRole === "ADMIN_KLP" && 
                userData.instansi_id && 
                userData.instansi_id !== currentInstansiId) {
                showToast("error", "Anda tidak memiliki akses untuk mengedit pengguna dari instansi lain");
                navigate('/settings-unit-kerja/manajemen-pengguna');
                return;
            }
            
            // Store original role for later checks
            setOriginalRole(userData.role);
            
            // Format the induk_unit_kerja_ids as an array if it exists
            const indukUnitKerjaIds = userData.induk_unit_kerja_ids || [];
            
            setFormData({
                nama_depan: userData.nama_depan || '',
                nama_belakang: userData.nama_belakang || '',
                username: userData.username || '',
                email: userData.email || '',
                password: '',
                role: userData.role || '',
                instansi_id: userData.instansi_id || '',
                induk_unit_kerja_ids: indukUnitKerjaIds
            });
            
            // Fetch instansi list for SUPER_ADMIN
            if (currentRole === "SUPER_ADMIN") {
                await fetchInstansi();
            } else if (userData.instansi_id) {
                // For non-SUPER_ADMIN, fetch the specific instansi to display name
                await fetchSpecificInstansi(userData.instansi_id);
            }
            
            // Fetch induk unit kerja list based on instansi
            if (userData.instansi_id) {
                await fetchIndukUnitKerja(userData.instansi_id, indukUnitKerjaIds);
            }
            
            setLoading(false);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan saat memuat data pengguna";
            setErrorMessage(errorMessage);
            setLoading(false);
        }
    }, [userId, navigate]);

    const fetchSpecificInstansi = async (instansiId) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getInstansiById(instansiId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            const instansi = {
                value: response.data.id,
                label: response.data.nama_instansi
            };
            setInstansiList([instansi]);
        } catch (error) {
            showToast("error", "Gagal memuat data instansi");
        }
    };

    const fetchInstansi = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                showToast("error", "Token tidak ditemukan. Silakan login kembali.");
                return;
            }
            
            const response = await axios.get(API_ENDPOINTS.getAllInstansi, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (!Array.isArray(response.data)) {
                showToast("error", "Format respons instansi tidak valid");
                return;
            }
            
            const options = response.data.map(instansi => ({
                value: instansi.id,
                label: instansi.nama_instansi
            }));
            
            setInstansiList(options);
        } catch (error) {
            if (error.response?.status === 401) {
                showToast("error", "Sesi anda telah berakhir. Silakan login kembali.");
                // Redirect to login page if needed
            } else {
                showToast("error", `Gagal memuat daftar instansi: ${error.message}`);
            }
        }
    };

    const fetchIndukUnitKerja = async (instansiId, selectedIds = []) => {
        if (!instansiId) return;
        
        let success = false;
        
        // First try with induk-unit-kerja endpoint
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(instansiId), {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            if (Array.isArray(response.data) && response.data.length > 0) {
                success = true;
                // Store all induk unit kerja IDs for the selected instansi
                const allIds = response.data.map(unit => unit.id);
                setAllIndukUnitKerjaIds(allIds);
                
                const options = response.data.map(unit => ({
                    value: unit.id,
                    label: unit.nama_induk_unit
                }));
                setIndukUnitKerjaList(options);
                
                // Set selected options for MultiSelectDropdown
                const selectedOptions = options.filter(option => 
                    selectedIds.includes(option.value)
                );
                setSelectedIndukUnitKerja(selectedOptions);
                
                // If user is ADMIN_KLP, automatically assign all induk unit kerja
                if (formData.role === "ADMIN_KLP") {
                    setFormData(prev => ({
                        ...prev,
                        induk_unit_kerja_ids: allIds
                    }));
                    setSelectedIndukUnitKerja(options);
                }
            }
        } catch (error) {
            console.warn("Failed with induk-unit-kerja endpoint, trying fallback:", error);
        }
        
        // If the first attempt failed, try with struktur-organisasi endpoint
        if (!success) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasiAvailableIndukUnits(instansiId), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                if (Array.isArray(response.data) && response.data.length > 0) {
                    // Store all induk unit kerja IDs for the selected instansi
                    const allIds = response.data.map(unit => unit.id);
                    setAllIndukUnitKerjaIds(allIds);
                    
                    const options = response.data.map(unit => ({
                        value: unit.id,
                        label: unit.nama_induk_unit
                    }));
                    setIndukUnitKerjaList(options);
                    
                    // Set selected options for MultiSelectDropdown
                    const selectedOptions = options.filter(option => 
                        selectedIds.includes(option.value)
                    );
                    setSelectedIndukUnitKerja(selectedOptions);
                    
                    // If user is ADMIN_KLP, automatically assign all induk unit kerja
                    if (formData.role === "ADMIN_KLP") {
                        setFormData(prev => ({
                            ...prev,
                            induk_unit_kerja_ids: allIds
                        }));
                        setSelectedIndukUnitKerja(options);
                    }
                    
                    success = true;
                }
            } catch (fallbackError) {
                console.error("Both attempts to fetch induk unit kerja failed:", fallbackError);
            }
        }
        
        if (!success) {
            showToast("error", "Gagal memuat data induk unit kerja");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'password') {
            validatePassword(value);
        }
    };

    const handleInstansiChange = async (selectedOption) => {
        const instansiId = selectedOption.value;
        
        setFormData(prev => ({
            ...prev,
            instansi_id: instansiId,
            induk_unit_kerja_ids: [] // Reset induk unit kerja when instansi changes
        }));
        
        setSelectedIndukUnitKerja([]);
        
        // Fetch induk unit kerja for the selected instansi
        await fetchIndukUnitKerja(instansiId);
    };

    const handleIndukUnitKerjaChange = (selectedOptions) => {
        setSelectedIndukUnitKerja(selectedOptions);
        const selectedIds = selectedOptions.map(option => option.value);
        
        setFormData(prev => ({
            ...prev,
            induk_unit_kerja_ids: selectedIds
        }));
    };

    const handleRoleChange = (selectedOption) => {
        const newRole = selectedOption.value;
        
        setFormData(prev => ({
            ...prev,
            role: newRole
        }));
        
        // If changing to ADMIN_KLP, automatically assign all induk unit kerja
        if (newRole === "ADMIN_KLP" && formData.instansi_id) {
            setFormData(prev => ({
                ...prev,
                role: newRole,
                induk_unit_kerja_ids: allIndukUnitKerjaIds
            }));
            setSelectedIndukUnitKerja(indukUnitKerjaList);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const validatePassword = (password) => {
        // If password is empty, it means no change
        if (!password) {
            setPasswordError("");
            return true;
        }

        let error = '';

        // Password validation rules
        if (password.length < 8) {
            error = 'Password harus terdiri dari setidaknya 8 karakter.';
        } else if (!/\d/.test(password)) {
            error = 'Password harus mengandung setidaknya satu angka.';
        } else if (!/[A-Z]/.test(password)) {
            error = 'Password harus mengandung setidaknya satu huruf besar.';
        } else if (!/[!@#$%^&*(),.-?":{}|<>]/.test(password)) {
            error = 'Password harus mengandung setidaknya satu karakter khusus.';
        }

        setPasswordError(error);
        return error === '';
    };

    const validateForm = () => {
        // Required fields
        if (!formData.nama_depan || !formData.nama_belakang || !formData.email || !formData.role) {
            showToast("error", "Semua field wajib diisi!");
            return false;
        }

        // Validate password only if it's provided (changed)
        if (formData.password && !validatePassword(formData.password)) {
            showToast("error", passwordError);
            return false;
        }

        // For non-SUPER_ADMIN and non-ADMIN_KLP roles, instansi and induk unit kerja are required
        if (formData.role !== "SUPER_ADMIN") {
            if (!formData.instansi_id) {
                showToast("error", "Instansi harus dipilih!");
                return false;
            }
            
            if (formData.role !== "ADMIN_KLP" && (!formData.induk_unit_kerja_ids || formData.induk_unit_kerja_ids.length === 0)) {
                showToast("error", "Induk Unit Kerja harus dipilih!");
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        
        try {
            const token = localStorage.getItem('access_token');
            
            // Create a copy of formData for the request
            const requestData = { ...formData };
            
            // Remove password if it's empty (no change)
            if (!requestData.password) {
                delete requestData.password;
            }
            
            await axios.put(API_ENDPOINTS.updateUser(userId), requestData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            showToast("success", "Pengguna berhasil diperbarui!");
            
            // Refresh user data
            await fetchUserData(currentUserRole, currentUserInstansiId);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan saat memperbarui pengguna";
            showToast("error", errorMessage);
            setLoading(false);
        }
    };

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
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="form-label">Nama Depan <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="nama_depan"
                            placeholder="Nama Depan"
                            value={formData.nama_depan}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Nama Belakang <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3"
                            name="nama_belakang"
                            placeholder="Nama Belakang"
                            value={formData.nama_belakang}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Username <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-3 bg-light"
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
                            className="form-control form-control-sm rounded-3"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control form-control-sm rounded-3"
                                name="password"
                                placeholder="Kosongkan jika tidak ingin mengubah password"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                            <button
                                type="button"
                                className="input-group-text"
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? <FiEyeOff /> : <FiEye />}
                            </button>
                        </div>
                        {passwordError && <div className="text-danger small mt-1">{passwordError}</div>}
                    </div>

                    <div className="mb-4">
                        <label className="form-label">Pilih Peran <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={roles}
                            selectedOption={formData.role ? roles.find(r => r.value === formData.role) : null}
                            onSelectOption={handleRoleChange}
                            defaultSelect="Pilih Peran"
                        />
                    </div>

                    {formData.role && formData.role !== "SUPER_ADMIN" && (
                        <>
                            <div className="mb-4">
                                <label className="form-label">Instansi <span className="text-danger">*</span></label>
                                {isSuperAdmin ? (
                                    <SelectDropdown
                                        options={instansiList}
                                        selectedOption={formData.instansi_id ? instansiList.find(option => option.value === formData.instansi_id) : null}
                                        onSelectOption={handleInstansiChange}
                                        defaultSelect="Pilih Instansi"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-3"
                                        value={instansiList.length > 0 ? instansiList[0]?.label : "Instansi sudah ditetapkan"}
                                        disabled
                                    />
                                )}
                            </div>

                            {/* Only show induk unit kerja selection for non-ADMIN_KLP users */}
                            {formData.role !== "ADMIN_KLP" && (
                                <div className="mb-4">
                                    <label className="form-label">Induk Unit Kerja <span className="text-danger">*</span></label>
                                    <MultiSelectDropdown
                                        options={indukUnitKerjaList}
                                        selectedOptions={selectedIndukUnitKerja}
                                        onChange={handleIndukUnitKerjaChange}
                                        placeholder="Pilih Induk Unit Kerja..."
                                        isDisabled={!formData.instansi_id}
                                    />
                                    <small className="text-muted">Pengguna dapat memiliki akses ke beberapa unit kerja</small>
                                </div>
                            )}
                            
                            {/* Show message for ADMIN_KLP users */}
                            {formData.role === "ADMIN_KLP" && (
                                <div className="mb-4">
                                    <div className="alert alert-info">
                                        Admin Organisasi akan otomatis memiliki akses ke semua Induk Unit Kerja di instansi yang dipilih.
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-3 mb-4">
                        <button className="btn bg-soft-danger text-danger" type="button" onClick={handleBack}>
                            <FiArrowLeft size={16} className="me-2" />Kembali
                        </button>
                        <button className="btn btn-primary" type="submit" disabled={loading}>
                            <FiSave size={16} className="me-2" />Simpan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

ManajemenPenggunaEditContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.number
};

export default ManajemenPenggunaEditContent;
