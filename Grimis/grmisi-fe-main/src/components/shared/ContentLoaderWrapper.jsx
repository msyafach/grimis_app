import PropTypes from 'prop-types';
import { PropagateLoader } from 'react-spinners';

const ContentLoaderWrapper = ({ loading, error = '', message = '', children }) => {
    if (loading) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '60vh' }}>
                <PropagateLoader color="#021526" size={15} />
                {message && <div className="mt-4 text-muted">{message}</div>}
            </div>
        );
    }

    if (error) {
        return <div className="text-danger text-center">{error}</div>;
    }

    return <>{children}</>;
};

ContentLoaderWrapper.propTypes = {
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string,
    message: PropTypes.string,
    children: PropTypes.node,
};

export default ContentLoaderWrapper;
