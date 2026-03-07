import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';
import CardHeader from '../shared/CardHeader';
import FullScreenLoader from '../shared/FullScreenLoader';

const EditProfileForm = () => {
    const [formData, setFormData] = useState({
        nama_depan: '',
        nama_belakang: '',
        email: ''
    });
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
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
                
                // Store full user data
                setUserData(response.data);
                
                // Set form data with current user information
                setFormData({
                    nama_depan: response.data.nama_depan || '',
                    nama_belakang: response.data.nama_belakang || '',
                    email: response.data.email || ''
                });
                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setError('Failed to load user data');
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const validateForm = () => {
        // Reset previous errors
        setError(null);

        // Check if required fields are filled
        if (!formData.nama_depan || !formData.email) {
            setError('Nama depan dan email harus diisi');
            return false;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Format email tidak valid');
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

        setSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            
            // Use the correct endpoint for updating user profile
            await axios.post(
                API_ENDPOINTS.updateSelfProfile,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setSuccess(true);

            // Redirect to profile after 2 seconds
            setTimeout(() => {
                navigate('/profile/details');
            }, 2000);

        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.response && error.response.data && error.response.data.detail) {
                setError(error.response.data.detail);
            } else {
                setError('Gagal memperbarui profil. Silakan coba lagi.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <div className='row justify-content-center'>
            <div className="col-lg-8">
                <Card className="border-0 shadow-sm">
                    <CardHeader 
                        title="Edit Your Profile" 
                        icon={<FiUser size={24} />}
                    />
                    <Card.Body className="p-4">
                        {error && (
                            <Alert variant="danger" className="mb-3">
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert variant="success" className="mb-3">
                                Profil berhasil diperbarui! Mengalihkan ke halaman profil...
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label">First Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="nama_depan"
                                    value={formData.nama_depan}
                                    onChange={handleChange}
                                    placeholder="First Name"
                                    disabled={submitting || success}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="nama_belakang"
                                    value={formData.nama_belakang}
                                    onChange={handleChange}
                                    placeholder="Last Name"
                                    disabled={submitting || success}
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Email"
                                    disabled={submitting || success}
                                />
                            </div>

                            <div className="d-flex justify-content-between mt-4">
                                <Button 
                                    variant="outline-secondary" 
                                    onClick={() => navigate('/profile/details')}
                                    disabled={submitting}
                                >
                                    CANCEL
                                </Button>
                                <Button 
                                    variant="primary" 
                                    type="submit"
                                    disabled={submitting || success}
                                >
                                    {submitting ? 'SAVING...' : 'SAVE CHANGES'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default EditProfileForm; 