import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button } from 'react-bootstrap';
import { FiCheck, FiX, FiBell } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

const NotificationsIndex = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            const res = await axios.get(API_ENDPOINTS.getNotifications, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (error) {
            console.error("Error fetching notifications", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMakeAsRead = async (id = null) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            if (id) {
                await axios.put(API_ENDPOINTS.markNotificationAsRead(id), {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.put(API_ENDPOINTS.markAllNotificationsAsRead, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchNotifications();
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };

    return (
        <div className="nxl-content pt-4">
            <div className="main-content">
                <div className="page-header">
                    <div className="page-header-left d-flex align-items-center">
                        <div className="page-header-title">
                            <h5 className="m-b-10">Notification History</h5>
                        </div>
                        <ul className="breadcrumb">
                            <li className="breadcrumb-item"><a href="/">Home</a></li>
                            <li className="breadcrumb-item">Notifications</li>
                        </ul>
                    </div>
                    <div className="page-header-right ms-auto">
                        <div className="page-header-right-items">
                            <div className="d-flex d-md-none">
                                <a href="#" className="page-header-right-close-toggle">
                                    <i className="feather-arrow-left me-2"></i>
                                    <span>Back</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12">
                        <Card className="stretch stretch-full">
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <h5 className="mb-0">All Notifications</h5>
                                </div>
                                <Button variant="outline-success" onClick={() => handleMakeAsRead()}>
                                    <FiCheck className="me-2" /> Mark All As Read
                                </Button>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {loading ? (
                                    <div className="text-center p-5">Loading notifications...</div>
                                ) : notifications.length === 0 ? (
                                    <div className="text-center p-5 text-muted">You have no notifications.</div>
                                ) : (
                                    <Table hover responsive className="mb-0">
                                        <tbody>
                                            {notifications.map((notification) => (
                                                <tr key={notification.id} className={!notification.is_read ? 'bg-soft-primary' : ''}>
                                                    <td className="w-50">
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-text avatar-md bg-soft-primary text-primary me-3">
                                                                <FiBell />
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-1">
                                                                    <Link to={notification.target_url || "#"} className={!notification.is_read ? 'fw-bold text-dark' : 'text-dark'}>
                                                                        {notification.title_first}
                                                                    </Link>
                                                                </h6>
                                                                <p className="fs-12 text-muted mb-0">{notification.title_second}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-end text-muted fs-12">
                                                        {notification.time_ago} ago
                                                    </td>
                                                    <td className="text-end">
                                                        {!notification.is_read && (
                                                            <Button variant="light" size="sm" onClick={() => handleMakeAsRead(notification.id)} title="Mark as Read">
                                                                <FiCheck className="text-success" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsIndex;
