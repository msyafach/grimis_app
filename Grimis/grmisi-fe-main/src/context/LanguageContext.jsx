import { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const defaultLang = import.meta.env.VITE_DEFAULT_LANG || 'id';
    const [language, setLanguage] = useState(defaultLang);

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

LanguageProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useLanguage = () => {
    return useContext(LanguageContext);
};