import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { useInstansi } from './InstansiContext';
import API_ENDPOINTS from '../config/apiConfig';
import { showToast } from '@/utils/toast';

const TahunContext = createContext();

export const TahunProvider = ({ children }) => {
    const [tahunId, setTahunId] = useState(null);
    const [tahunList, setTahunList] = useState([]);
    const { idInstansi } = useInstansi();

    const fetchAvailableYears = useCallback(async () => {
        if (!idInstansi) return false;

        try {
            const token = localStorage.getItem('access_token');
            const res = await axios.get(API_ENDPOINTS.getTahun(idInstansi), {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data;
            if (Array.isArray(data) && data.length > 0) {
                setTahunList(data);
                setTahunId(data[0]);
                localStorage.setItem('tahun', data[0]);
                return true;
            } else {
                // Fallback to current year if no data is available
                const currentYear = new Date().getFullYear();
                setTahunList([currentYear]);
                setTahunId(currentYear);
                localStorage.setItem('tahun', currentYear);
                console.info(`No years available from backend, using current year (${currentYear}) as fallback`);
                return true;
            }
        } catch (err) {
            console.error("Gagal mengambil tahun:", err);
            
            // Fallback to current year on error
            const currentYear = new Date().getFullYear();
            setTahunList([currentYear]);
            setTahunId(currentYear);
            localStorage.setItem('tahun', currentYear);
            console.info(`Error fetching years, using current year (${currentYear}) as fallback`);
            return true;
        }
    }, [idInstansi]);


    useEffect(() => {
        if (idInstansi) {
            fetchAvailableYears();
        }
    }, [idInstansi, fetchAvailableYears]);

    return (
        <TahunContext.Provider value={{
            tahunId,
            setTahunId,
            tahunList,
            fetchAvailableYears
        }}>
            {children}
        </TahunContext.Provider>
    );
};

TahunProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useTahun = () => useContext(TahunContext);
