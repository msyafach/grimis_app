import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

const NotificationsModal = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            const res = await axios.get(API_ENDPOINTS.getNotifications, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error("Error fetching notifications", error);
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
        <div className="dropdown nxl-h-item">
            <div className="nxl-head-link me-3" data-bs-toggle="dropdown" role="button" data-bs-auto-close="outside">
                <FiBell size={20} />
                {unreadCount > 0 && <span className="badge bg-danger nxl-h-badge">{unreadCount}</span>}
            </div>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown nxl-notifications-menu">
                <div className="d-flex justify-content-between align-items-center notifications-head">
                    <h6 className="fw-bold text-dark mb-0">Notifications</h6>
                    <Link to="#" className="fs-11 text-success text-end ms-auto" data-bs-toggle="tooltip" title="Make as Read" onClick={(e) => { e.preventDefault(); handleMakeAsRead(); }}>
                        <FiCheck size={16} />
                        <span>Make as Read</span>
                    </Link>
                </div>

                <div className="notifications-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {notifications.length > 0 ? notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            id={notification.id}
                            time={notification.time_ago}
                            titleFirst={notification.title_first}
                            titleSecond={notification.title_second}
                            isRead={notification.is_read}
                            targetUrl={notification.target_url}
                            onMarkAsRead={() => handleMakeAsRead(notification.id)}
                        />
                    )) : (
                        <div className="p-3 text-center text-muted">No notifications</div>
                    )}
                </div>

                <div className="text-center notifications-footer">
                    <Link to="/notifications" className="fs-13 fw-semibold text-dark">All Notifications</Link>
                </div>
            </div>
        </div>
    )
}

export default NotificationsModal

const Card = ({ id, time, titleFirst, titleSecond, isRead, targetUrl, onMarkAsRead }) => {
    return (
        <div className={`notifications-item ${!isRead ? 'bg-light' : ''}`}>
            <img src="/images/avatar/2.png" alt="" className="rounded me-3 border" />
            <div className="notifications-desc">
                <Link to={targetUrl || "#"} className="font-body text-truncate-2-line"> <span className="fw-semibold text-dark">{titleFirst}</span> {titleSecond}</Link>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="notifications-date text-muted border-bottom border-bottom-dashed">{time} ago</div>
                    <div className="d-flex align-items-center float-end gap-2">
                        {!isRead && (
                            <span
                                className="d-block wd-8 ht-8 rounded-circle bg-gray-300"
                                data-bs-toggle="tooltip"
                                title="Make as Read"
                                onClick={(e) => { e.preventDefault(); onMarkAsRead(); }}
                                style={{ cursor: 'pointer' }}
                            ></span>
                        )}
                        <span className="text-danger" data-bs-toggle="tooltip" title="Remove"> <FiX className="fs-12" /></span>
                    </div>
                </div>
            </div>
        </div>
    )
}