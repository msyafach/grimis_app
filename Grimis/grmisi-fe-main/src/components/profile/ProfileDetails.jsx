import React, { useState, useEffect } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { FiUser, FiMail, FiTag, FiCalendar } from 'react-icons/fi';
import axios from 'axios';
import API_ENDPOINTS from '../../config/apiConfig';
import { getRoleLabel } from '../../utils/roleUtils';
import FullScreenLoader from '../shared/FullScreenLoader';
import CardHeader from '../shared/CardHeader';

const ProfileDetailsComponent = () => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                console.error('Error fetching user data:', error);
                setError('Failed to load user data');
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (loading) {
        return <FullScreenLoader />;
    }

    if (error) {
        return (
            <div className="row">
                <div className="col-12">
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            <div className="alert alert-danger">{error}</div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className='row'>
            <div className="col-lg-4 col-md-5">
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4 text-center">
                        <div className="mb-3">
                            <img 
                                src="/images/avatar/0.webp" 
                                alt="User Avatar" 
                                className="rounded-circle img-fluid" 
                                style={{ width: '120px', height: '120px', objectFit: 'cover' }} 
                            />
                        </div>
                        <h4 className="mb-1">{userData.nama_depan} {userData.nama_belakang}</h4>
                        <p className="text-muted mb-2">{userData.email}</p>
                        <span className="badge bg-soft-primary text-primary mb-3">
                            {getRoleLabel(userData.role)}
                        </span>
                    </Card.Body>
                </Card>
            </div>

            <div className="col-lg-8 col-md-7">
                <Card className="border-0 shadow-sm">
                    <CardHeader title="Profile Information" />
                    <Card.Body className="p-4">
                        <div className="table-responsive">
                            <table className="table table-borderless">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '30%' }} className="text-muted">
                                            <FiUser className="me-2" /> First Name
                                        </td>
                                        <td>{userData.nama_depan}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">
                                            <FiUser className="me-2" /> Last Name
                                        </td>
                                        <td>{userData.nama_belakang}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">
                                            <FiMail className="me-2" /> Email
                                        </td>
                                        <td>{userData.email}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">
                                            <FiTag className="me-2" /> Username
                                        </td>
                                        <td>{userData.username}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">
                                            <FiTag className="me-2" /> Role
                                        </td>
                                        <td>{getRoleLabel(userData.role)}</td>
                                    </tr>
                                    {userData.instansi_id && userData.nama_instansi && (
                                        <tr>
                                            <td className="text-muted">
                                                <FiTag className="me-2" /> Institution
                                            </td>
                                            <td>{userData.nama_instansi}</td>
                                        </tr>
                                    )}
                                    {userData.created_at && (
                                        <tr>
                                            <td className="text-muted">
                                                <FiCalendar className="me-2" /> Member Since
                                            </td>
                                            <td>{new Date(userData.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        </div>
    );
};

export default ProfileDetailsComponent; 