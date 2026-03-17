import React, { useState, useEffect } from 'react';
import { FiHome, FiLock, FiLogOut, FiUser, FiEdit } from "react-icons/fi";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_ENDPOINTS from '../../../config/apiConfig';
import { getRoleLabel } from '../../../utils/roleUtils';
import { Modal, Button } from 'react-bootstrap';

const ProfileModal = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const navigate = useNavigate();

    // Fetch user data when component mounts
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setUserData(response.data);
                setLoading(false);
            } catch (error) {
                setError('Failed to load user data');
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Show loading or error if needed
    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    // Handle navigation to profile details page
    const handleProfileDetails = () => {
        navigate('/profile/details');
    };

    // Handle navigation to change password page
    const handleChangePassword = () => {
        navigate('/profile/change-password');
    };

    // Handle navigation to edit profile page
    const handleEditProfile = () => {
        navigate('/profile/edit');
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/authentication/login');
    };

    // Toggle logout confirmation modal
    const toggleLogoutModal = () => {
        setShowLogoutModal(!showLogoutModal);
    };

    return (
        <>
            <div className="dropdown nxl-h-item">
                <a href="#" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                    <img src="/images/avatar/0.webp" alt="user-image" className="img-fluid user-avtar me-0" />
                </a>
                <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-user-dropdown">
                    <div className="dropdown-header">
                        <div className="d-flex align-items-center">
                            <img src="/images/avatar/0.webp" alt="user-image" className="img-fluid user-avtar" />
                            <div>
                                <h6 className="text-dark mb-0">
                                    {userData.nama_depan} {userData.nama_belakang}
                                    <span className="badge bg-soft-success text-success ms-1">
                                        {getRoleLabel(userData.role)}
                                    </span>
                                </h6>
                                <span className="fs-12 fw-medium text-muted">{userData.email}</span>
                            </div>
                        </div>
                    </div>
                    <a href="#" className="dropdown-item" onClick={handleProfileDetails}>
                        <i><FiUser /></i>
                        <span>Profile Details</span>
                    </a>
                    <a href="#" className="dropdown-item" onClick={handleEditProfile}>
                        <i><FiEdit /></i>
                        <span>Edit Profile</span>
                    </a>
                    <a href="#" className="dropdown-item" onClick={handleChangePassword}>
                        <i><FiLock /></i>
                        <span>Ubah Password</span>
                    </a>
                    <div className="dropdown-divider"></div>
                    <a href="#" className="dropdown-item btn btn-danger rounded-4" onClick={toggleLogoutModal}>
                        <i><FiLogOut /></i>
                        <span>Logout</span>
                    </a>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            <Modal show={showLogoutModal} onHide={toggleLogoutModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Konfirmasi Logout</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Apakah Anda yakin ingin keluar dari aplikasi?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={toggleLogoutModal}>
                        Batal
                    </Button>
                    <Button variant="danger" onClick={handleLogout}>
                        Logout
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default ProfileModal;
