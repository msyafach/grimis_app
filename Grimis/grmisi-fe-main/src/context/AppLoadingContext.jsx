import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const AppLoadingContext = createContext();

export const AppLoadingProvider = ({ children }) => {
    const [loadingRedirect, setLoadingRedirect] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    return (
        <AppLoadingContext.Provider value={{
            loadingRedirect,
            setLoadingRedirect,
            loadingMessage,
            setLoadingMessage
        }}>
            {children}
        </AppLoadingContext.Provider>
    );
};

AppLoadingProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useAppLoading = () => useContext(AppLoadingContext);
