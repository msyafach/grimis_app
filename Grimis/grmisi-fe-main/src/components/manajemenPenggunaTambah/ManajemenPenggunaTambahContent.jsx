import { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiSave, FiArrowLeft } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import { translate, setLanguage } from '@/utils/i18n';
import SelectDropdown from '@/components/shared/SelectDropdown';
import MultiSelectDropdown from '@/components/shared/MultiSelectDropdown';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';

setLanguage('id');

const roles = [
    { label: "Super Admin", value: "SUPER_ADMIN" },
    { label: "Admin Organisasi", value: "ADMIN_KLP" },
    { label: "Unit Manajemen Risiko", value: "UNIT_MANAJEMEN_RISIKO" },
    { label: "Pemilik Risiko", value: "PEMILIK_RISIKO" },
    { label: "Pengelola Risiko", value: "PENGELOLA_RISIKO" },
    { label: "Pengawas Intern", value: "PENGAWAS_INTERN" },
    { label: "Pegawai", value: "PEGAWAI" }
];

const ManajemenPenggunaTambahContent = ({ title = "Tambah Pengguna", resetKey }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const navigate = useNavigate();
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
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [instansiList, setInstansiList] = useState([]);
    const [indukUnitKerjaList, setIndukUnitKerjaList] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState("");
    const [currentUserInstansiId, setCurrentUserInstansiId] = useState("");
    const [selectedIndukUnitKerja, setSelectedIndukUnitKerja] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [allIndukUnitKerjaIds, setAllIndukUnitKerjaIds] = useState([]);
    const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
    const [sendEmail, setSendEmail] = useState(true);

    // Fetch current user info
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCurrentUserRole(response.data.role);
                setCurrentUserInstansiId(response.data.instansi_id);
                setIsSuperAdmin(response.data.role === "SUPER_ADMIN");
                
                // If ADMIN_KLP, set the instansi_id automatically
                if (response.data.role === "ADMIN_KLP" && response.data.instansi_id) {
                    setFormData(prev => ({
                        ...prev,
                        instansi_id: response.data.instansi_id
                    }));
                }
            } catch (error) {
                console.error("Error fetching current user:", error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Fetch instansi list (only for SUPER_ADMIN)
    useEffect(() => {
        if (isSuperAdmin) {
            const fetchInstansi = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const response = await axios.get(API_ENDPOINTS.getInstansi, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const options = response.data.map(instansi => ({
                        value: instansi.id,
                        label: instansi.nama_instansi
                    }));
                    setInstansiList(options);
                } catch (error) {
                    console.error("Error fetching instansi:", error);
                }
            };

            fetchInstansi();
        }
    }, [isSuperAdmin]);

    // Fetch induk unit kerja list when instansi is selected
    useEffect(() => {
        if (formData.instansi_id) {
            const fetchIndukUnitKerja = async () => {
                if (!formData.instansi_id) return;
                
                let success = false;
                
                // First try with induk-unit-kerja endpoint
                try {
                    const token = localStorage.getItem('access_token');
                    const response = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(formData.instansi_id), {
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
                        const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasiAvailableIndukUnits(formData.instansi_id), {
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

            fetchIndukUnitKerja();
        }
    }, [formData.instansi_id]);

    const handleInputChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value
        }));

        if (e.target.name === 'password') {
            validatePassword(e.target.value);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const validatePassword = (password) => {
        let error = "";

        // 1. Minimal 8 karakter
        if (password.length < 8) {
            error = "Password harus terdiri dari setidaknya 8 karakter.";
        }
        // 2. Harus mengandung angka
        else if (!/\d/.test(password)) {
            error = "Password harus mengandung setidaknya satu angka.";
        }
        // 3. Harus mengandung huruf besar
        else if (!/[A-Z]/.test(password)) {
            error = "Password harus mengandung setidaknya satu huruf besar.";
        }
        // 4. Harus mengandung karakter khusus
        else if (!/[!@#$%^&*(),.-?":{}|<>]/.test(password)) {
            error = "Password harus mengandung setidaknya satu karakter khusus.";
        }

        setPasswordError(error);
        return error === "";
    };

    const validateForm = () => {
        if (!formData.role) {
            showToast("error", "Peran harus dipilih!");
            return false;
        }

        if (formData.role !== "SUPER_ADMIN") {
            if (!formData.instansi_id) {
                showToast("error", "Instansi harus dipilih!");
                return false;
            }

            // For non-ADMIN_KLP users, require at least one induk unit kerja
            if (formData.role !== "ADMIN_KLP" && (!formData.induk_unit_kerja_ids || formData.induk_unit_kerja_ids.length === 0)) {
                showToast("error", "Minimal satu Induk Unit Kerja harus dipilih!");
                return false;
            }
        }

        // Validate password only if not auto-generating
        if (!autoGeneratePassword && passwordError) {
            showToast("error", passwordError);
            return false;
        }

        // If not auto-generating, password is required
        if (!autoGeneratePassword && !formData.password) {
            showToast("error", "Password harus diisi!");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage("");

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('access_token');

            // Prepare data - remove password if auto-generate is enabled
            const submitData = {
                ...formData,
                send_email: sendEmail
            };

            if (autoGeneratePassword) {
                delete submitData.password;
            }

            await axios.post(API_ENDPOINTS.registerUser, submitData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const successMessage = sendEmail
                ? "Pengguna Berhasil Ditambahkan! Email dengan password telah dikirim."
                : "Pengguna Berhasil Ditambahkan!";
            showToast("success", successMessage);
            resetKey((prevKey) => prevKey + 1);
            navigate('/settings-unit-kerja/manajemen-pengguna');
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Terjadi kesalahan. Silakan coba lagi.";
            const translatedError = translate(errorMessage);
            showToast("error", translatedError);
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/settings-unit-kerja/manajemen-pengguna');
    };

    const handleRoleChange = (option) => {
        setFormData({
            ...formData,
            role: option.value,
            // Reset induk_unit_kerja_ids when changing role
            induk_unit_kerja_ids: option.value === "ADMIN_KLP" && allIndukUnitKerjaIds.length > 0 ? 
                allIndukUnitKerjaIds : []
        });
        
        // Update the selected options for the UI if ADMIN_KLP
        if (option.value === "ADMIN_KLP" && indukUnitKerjaList.length > 0) {
            setSelectedIndukUnitKerja(indukUnitKerjaList);
        } else {
            setSelectedIndukUnitKerja([]);
        }
    };

    const handleInstansiChange = (option) => {
        setFormData({
            ...formData,
            instansi_id: option.value,
            induk_unit_kerja_ids: [] // Reset induk unit kerja when instansi changes
        });
        setSelectedIndukUnitKerja([]);
    };

    const handleIndukUnitKerjaChange = (selectedOptions) => {
        setSelectedIndukUnitKerja(selectedOptions);
        setFormData({
            ...formData,
            induk_unit_kerja_ids: selectedOptions.map(option => option.value)
        });
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
                                {/* Form Fields */}
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
                                        className="form-control form-control-sm rounded-3"
                                        name="username"
                                        placeholder="Username"
                                        value={formData.username}
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

                                <div className="mb-4">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="autoGeneratePassword"
                                            checked={autoGeneratePassword}
                                            onChange={(e) => setAutoGeneratePassword(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="autoGeneratePassword">
                                            Generate Password Otomatis
                                        </label>
                                    </div>
                                </div>

                                {!autoGeneratePassword && (
                                    <div className="mb-4">
                                        <label className="form-label">Password <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control form-control-sm rounded-3"
                                                name="password"
                                                placeholder="Password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text"
                                                onClick={togglePasswordVisibility}
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                        {passwordError && <div className="text-danger">{passwordError}</div>}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="sendEmail"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="sendEmail">
                                            Kirim Email dengan Password ke Pengguna
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label">Pilih Peran <span className="text-danger">*</span></label>
                                    <SelectDropdown
                                        options={currentUserRole === "ADMIN_KLP" ? 
                                            roles.filter(role => !["SUPER_ADMIN", "ADMIN_KLP"].includes(role.value)) : 
                                            roles}
                                        selectedOption={formData.role ? { label: roles.find(role => role.value === formData.role)?.label, value: formData.role } : null}
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
                                                    value="Instansi sudah ditetapkan"
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
                                        <FiArrowLeft size={16} className="me-2" />
                                        Kembali
                                    </button>
                                    <button className="btn btn-primary" type="submit" disabled={loading}>
                                        <FiSave size={16} className="me-2" />
                                        Simpan
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

ManajemenPenggunaTambahContent.propTypes = {
    title: PropTypes.string,
    resetKey: PropTypes.func.isRequired,
};

export default ManajemenPenggunaTambahContent;
