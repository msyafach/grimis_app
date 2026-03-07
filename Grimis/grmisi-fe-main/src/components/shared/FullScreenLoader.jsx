import { PropagateLoader } from 'react-spinners';
import PropTypes from 'prop-types';
import { useAppLoading } from '../../context/AppLoadingContext';
const FullScreenLoader = ({ message = '...' }) => {
    const logo = "/images/logo-abbr.png";
    const { loadingMessage } = useAppLoading();

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 9999,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#021526',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#fff'
            }}
        >
            <img src={logo} alt="Logo" style={{ width: '120px', marginBottom: '30px' }} />
            <PropagateLoader color="#ffffff" size={15} />
            <p className="mt-4 fs-6">{loadingMessage || message}</p>
        </div>
    );
};

FullScreenLoader.propTypes = {
    message: PropTypes.string,
};

export default FullScreenLoader;
