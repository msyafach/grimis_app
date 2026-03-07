import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { FiLock, FiKey, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';
import CardHeader from '../shared/CardHeader';

const ChangePasswordForm = () => {
    const [formData, setFormData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));

        if (name === 'new_password') {
            validatePassword(value);
        }
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
        // Reset previous errors
        setError(null);

        // Check if all fields are filled
        if (!formData.current_password || !formData.new_password || !formData.confirm_password) {
            setError('Semua field harus diisi');
            return false;
        }

        // Validate password complexity
        if (!validatePassword(formData.new_password)) {
            setError(passwordError);
            return false;
        }

        // Check if passwords match
        if (formData.new_password !== formData.confirm_password) {
            setError('Password baru dan konfirmasi tidak cocok');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            await axios.post(
                API_ENDPOINTS.changePassword,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setSuccess(true);
            setFormData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });

            // Redirect to profile after 2 seconds
            setTimeout(() => {
                navigate('/profile/details');
            }, 2000);

        } catch (error) {
            console.error('Error changing password:', error);
            if (error.response && error.response.data && error.response.data.detail) {
                setError(error.response.data.detail);
            } else {
                setError('Gagal mengubah password. Silakan coba lagi.');
            }
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        switch (field) {
            case 'current_password':
                setShowCurrentPassword(!showCurrentPassword);
                break;
            case 'new_password':
                setShowNewPassword(!showNewPassword);
                break;
            case 'confirm_password':
                setShowConfirmPassword(!showConfirmPassword);
                break;
            default:
                break;
        }
    };

    return (
        <div className='row justify-content-center'>
            <div className="col-lg-8">
                <Card className="border-0 shadow-sm">
                    <CardHeader 
                        title="Ubah Password" 
                        subtitle="Perbarui password Anda untuk menjaga keamanan akun" 
                        icon={<FiShield size={24} />}
                    />
                    <Card.Body className="p-4">
                        {error && (
                            <Alert variant="danger" className="mb-4">
                                <div className="d-flex align-items-center">
                                    <i className="me-2"><FiKey /></i>
                                    <span>{error}</span>
                                </div>
                            </Alert>
                        )}

                        {success && (
                            <Alert variant="success" className="mb-4">
                                <div className="d-flex align-items-center">
                                    <i className="me-2"><FiShield /></i>
                                    <span>Password berhasil diubah! Mengalihkan ke halaman profil...</span>
                                </div>
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="form-label">Password Saat Ini <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        className="form-control form-control-sm rounded-start"
                                        name="current_password"
                                        placeholder="Masukkan password saat ini"
                                        value={formData.current_password}
                                        onChange={handleChange}
                                        disabled={loading || success}
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text"
                                        onClick={() => togglePasswordVisibility('current_password')}
                                    >
                                        {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Password Baru <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className="form-control form-control-sm rounded-start"
                                        name="new_password"
                                        placeholder="Masukkan password baru"
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        disabled={loading || success}
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text"
                                        onClick={() => togglePasswordVisibility('new_password')}
                                    >
                                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                {passwordError && <div className="text-danger small mt-1">{passwordError}</div>}
                                {!passwordError && formData.new_password && (
                                    <div className="text-success small mt-1">Password valid</div>
                                )}
                                <div className="text-muted small mt-1">
                                    Password harus memiliki minimal 8 karakter, 1 huruf besar, 1 angka, dan 1 karakter khusus.
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Konfirmasi Password Baru <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="form-control form-control-sm rounded-start"
                                        name="confirm_password"
                                        placeholder="Konfirmasi password baru"
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        disabled={loading || success}
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text"
                                        onClick={() => togglePasswordVisibility('confirm_password')}
                                    >
                                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                {formData.new_password && formData.confirm_password && 
                                 formData.new_password === formData.confirm_password ? (
                                    <div className="text-success small mt-1">Password cocok</div>
                                ) : formData.confirm_password ? (
                                    <div className="text-danger small mt-1">Password tidak cocok</div>
                                ) : null}
                            </div>

                            <div className="d-flex justify-content-between mt-4">
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => navigate('/profile/details')}
                                    disabled={loading}
                                    className="px-4"
                                >
                                    Batal
                                </Button>
                                <Button 
                                    variant="primary" 
                                    type="submit"
                                    disabled={loading || success}
                                    className="px-4"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default ChangePasswordForm; 