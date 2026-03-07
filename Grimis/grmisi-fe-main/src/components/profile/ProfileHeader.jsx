import { FiEdit, FiLock } from 'react-icons/fi'
import { Link, useLocation } from 'react-router-dom';

const ProfileHeader = () => {
    const location = useLocation();
    const currentPath = location.pathname;
    
    // Don't show action buttons on edit or change password pages
    if (currentPath === '/profile/edit' || currentPath === '/profile/change-password') {
        return null;
    }
    
    return (
        <>
            <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
                <Link to="/profile/edit" className="btn btn-primary">
                    <FiEdit size={16} className='me-2' />
                    <span>Edit Profile</span>
                </Link>
                <Link to="/profile/change-password" className="btn btn-outline-secondary">
                    <FiLock size={16} className='me-2' />
                    <span>Change Password</span>
                </Link>
            </div>
        </>
    )
}

export default ProfileHeader 