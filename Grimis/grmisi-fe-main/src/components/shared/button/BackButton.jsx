import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const BackButton = ({ to = '/', label = 'Kembali' }) => {
    const navigate = useNavigate();

    return (
        <div className="d-flex align-items-center mb-3 p-0">
            <button
                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center"
                type="button"
                onClick={() => navigate(to)}
            >
                <FiArrowLeft size={16} className="me-2" />
                {label}
            </button>
        </div>
    );
};

BackButton.propTypes = {
    to: PropTypes.string,
    label: PropTypes.string
};

export default BackButton;
