import { useState, useEffect, useRef } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';
import { useAuth } from '../../context/AuthContext';
import FullScreenLoader from '../shared/FullScreenLoader';

// Google reCAPTCHA site key (demo/test key from Google)
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const LoginForm = ({ registerPath, resetPath }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const recaptchaWidgetRef = useRef(null);
    const { login } = useAuth();

    // Load reCAPTCHA script
    useEffect(() => {
        const loadRecaptchaScript = () => {
            if (document.getElementById('recaptcha-script')) {
                return;
            }
            const script = document.createElement('script');
            script.id = 'recaptcha-script';
            script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaLoad`;
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        };

        // Global callback for reCAPTCHA load
        window.onRecaptchaLoad = () => {
            if (document.getElementById('recaptcha-container')) {
                recaptchaWidgetRef.current = window.grecaptcha.render('recaptcha-container', {
                    sitekey: RECAPTCHA_SITE_KEY,
                    callback: handleRecaptchaSuccess,
                    'expired-callback': handleRecaptchaExpired,
                    'error-callback': handleRecaptchaError,
                });
            }
        };

        loadRecaptchaScript();

        return () => {
            // Cleanup widget on unmount
            if (recaptchaWidgetRef.current && window.grecaptcha) {
                window.grecaptcha.reset(recaptchaWidgetRef.current);
            }
        };
    }, []);

    const handleRecaptchaSuccess = (token) => {
        setRecaptchaToken(token);
        setError('');
    };

    const handleRecaptchaExpired = () => {
        setRecaptchaToken(null);
        setError('CAPTCHA telah kadaluarsa. Silakan verifikasi ulang.');
        // Auto reset reCAPTCHA
        if (recaptchaWidgetRef.current && window.grecaptcha) {
            window.grecaptcha.reset(recaptchaWidgetRef.current);
        }
    };

    const handleRecaptchaError = (error) => {
        console.error('reCAPTCHA Error:', error);
        setError('reCAPTCHA verification error. Silakan muat ulang halaman.');
    };

    const resetRecaptcha = () => {
        setRecaptchaToken(null);
        if (recaptchaWidgetRef.current && window.grecaptcha) {
            window.grecaptcha.reset(recaptchaWidgetRef.current);
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setError('');

        // Check if reCAPTCHA is verified
        if (!recaptchaToken) {
            setError('Silakan verifikasi CAPTCHA terlebih dahulu.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(API_ENDPOINTS.authLogin, {
                username,
                password,
                recaptcha_token: recaptchaToken,
            });

            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);
            sessionStorage.setItem('access_token', access_token);
            await fetchUserData(access_token);
            window.location.href = '/';
        } catch (error) {
            console.error('Login Error:', error);
            const errorMessage = error.response?.data?.detail || 'Invalid username or password';
            setError(errorMessage);
            // Reset reCAPTCHA on login error
            resetRecaptcha();
        } finally {
            setLoading(false);
        }
    };

    const fetchUserData = async (token) => {
        try {
            const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const userData = response.data;
            localStorage.setItem('user_role', userData.role);
            localStorage.setItem('id_induk_unit_kerja', userData.last_induk_unit_kerja_id || '');
            login(userData);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(prev => !prev);
    if (loading) return <FullScreenLoader message="Memproses login ..." />;

    return (
        <>
            <div className="text-center mb-4">
                <div
                    className="bg-primary d-inline-flex align-items-center justify-content-center rounded-4"
                    style={{ height: '100px' }}
                >
                    <img
                        src="/images/logo-abbr.png"
                        alt="GRIMIS Logo"
                        style={{ width: '25%', objectFit: 'contain' }}
                    />
                </div>
            </div>

            <h2 className="fs-20 fw-bolder mb-4">Login</h2>
            <h4 className="fs-13 fw-bold mb-2">Masuk ke akun Anda</h4>
            <p className="fs-12 fw-medium text-muted">
                Selamat datang kembali di <strong>GRIMIS</strong>. Kelola risiko bisnis Anda dengan lebih cerdas.
            </p>
            <form onSubmit={handleLogin} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <label className="form-label">Email atau Username <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Email atau Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label className="form-label">Password <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control form-control-sm"
                            placeholder="Kata Sandi"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                    {error && <div className="alert alert-danger">{error}</div>}
                </div>
                <div className="mb-4">
                    <label className="form-label">Verifikasi <span className="text-danger">*</span></label>
                    <div id="recaptcha-container" className="d-flex justify-content-center"></div>
                </div>
                <div className="mt-5">
                    <button type="submit" className="btn btn-lg btn-primary w-100">
                        Login
                    </button>
                </div>
            </form >
        </>
    );
};

export default LoginForm;
