import React, { useState } from 'react';
import { FiFacebook, FiGithub, FiTwitter } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';

const LoginForm = ({ registerPath, resetPath }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (event) => {
        event.preventDefault();

        try {
            const response = await axios.post(API_ENDPOINTS.login, {
                username: username,
                password: password
            });

            // Simpan token atau lanjutkan sesuai kebutuhan
            const { access_token } = response.data;
            localStorage.setItem('access_token', access_token);  // Menyimpan token di localStorage (jika perlu)

            // Redirect ke halaman lain setelah login sukses
            window.location.href = '/';  // Sesuaikan dengan rute aplikasi kamu
        } catch (error) {
            // console.error(error.response);
            setError('Invalid username or password');
        }
    };

    return (
        <>
            <h2 className="fs-20 fw-bolder mb-4">Login</h2>
            <h4 className="fs-13 fw-bold mb-2">Login to your account</h4>
            <p className="fs-12 fw-medium text-muted">
                Thank you for getting back to <strong>GRIMIS</strong> web applications, let's access our best risk management for company.
            </p>
            <form onSubmit={handleLogin} className="w-100 mt-4 pt-2">
                <div className="mb-4">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Email or Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="password"
                        className="form-control"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="custom-control custom-checkbox">
                            <input type="checkbox" className="custom-control-input" id="rememberMe" />
                            <label className="custom-control-label c-pointer" htmlFor="rememberMe">
                                Remember Me
                            </label>
                        </div>
                    </div>
                    <div>
                        <Link to={resetPath} className="fs-11 text-primary">
                            Forget password?
                        </Link>
                    </div>
                </div>
                <div className="mt-5">
                    <button type="submit" className="btn btn-lg btn-primary w-100">
                        Login
                    </button>
                </div>
            </form>
            <div className="w-100 mt-5 text-center mx-auto">
                <div className="mb-4 border-bottom position-relative">
                    <span className="small py-1 px-3 text-uppercase text-muted bg-white position-absolute translate-middle">or</span>
                </div>
                <div className="d-flex align-items-center justify-content-center gap-2">
                    <a href="#" className="btn btn-light-brand flex-fill" data-bs-toggle="tooltip" data-bs-trigger="hover" title="Login with Facebook">
                        <FiFacebook size={16} />
                    </a>
                    <a href="#" className="btn btn-light-brand flex-fill" data-bs-toggle="tooltip" data-bs-trigger="hover" title="Login with Twitter">
                        <FiTwitter size={16} />
                    </a>
                    <a href="#" className="btn btn-light-brand flex-fill" data-bs-toggle="tooltip" data-bs-trigger="hover" title="Login with Github">
                        <FiGithub size={16} className="text" />
                    </a>
                </div>
            </div>
            <div className="mt-5 text-muted">
                <span> Don't have an account?</span>
                <Link to={registerPath} className="fw-bold"> Create an Account</Link>
            </div>
        </>
    );
};

export default LoginForm;
