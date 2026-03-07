import React from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate untuk redirect

const LogoutModal = () => {
    const navigate = useNavigate();  // Hook untuk melakukan redirect ke halaman login

    // Fungsi untuk menangani proses logout
    const handleLogout = () => {
        localStorage.removeItem('access_token');  // Menghapus token dari localStorage
        navigate('/authentication/login');        // Redirect ke halaman login
    };

    return (
        <div
            className="modal fade"
            id="logoutModal"
            tabIndex={-1}
            data-bs-keyboard="false"
            role="dialog"
        >
            <div
                className="modal-dialog modal-dialog-centered"
                role="document"
            >
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Konfirmasi Logout</h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>
                    <div className="modal-body">
                        <p>Apakah Anda yakin ingin logout?</p>
                    </div>
                    <div className="modal-footer">
                        <button
                            className="btn btn-light-secondary"
                            data-bs-dismiss="modal"
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-danger"
                            data-bs-dismiss="modal"
                            onClick={handleLogout}  // Memanggil handleLogout saat tombol klik
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
