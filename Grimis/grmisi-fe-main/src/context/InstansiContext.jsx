import { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import API_ENDPOINTS from '../config/apiConfig';

const InstansiContext = createContext();

export const InstansiProvider = ({ children }) => {
    const [idInstansi, setIdInstansi] = useState(() => {
        return localStorage.getItem('id_instansi') || '';
    });

    // Verifikasi ID instansi saat komponen dimount
    useEffect(() => {
        const verifyInstansiId = async () => {
            const storedId = localStorage.getItem('id_instansi');
            if (!storedId) return;

            try {
                const token = localStorage.getItem('access_token');
                if (!token) {
                    // Tidak ada token, biarkan - user mungkin belum login
                    return;
                }

                // Verifikasi apakah instansi masih ada di database
                try {
                    const response = await axios.get(API_ENDPOINTS.getInstansiById(storedId), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    // Instansi valid - simpan nama jika ada
                    if (response.data?.nama_instansi) {
                        localStorage.setItem('nama_instansi', response.data.nama_instansi);
                    }
                } catch (err) {
                    // Hanya hapus jika error sebenarnya (bukan network error atau 404)
                    if (err.response && err.response.status === 404) {
                        console.warn("Instansi ID tidak valid, menghapus dari localStorage");
                        localStorage.removeItem('id_instansi');
                        setIdInstansi('');
                    }
                    // Jika network error atau lainnya, biarkan saja
                }
            } catch (err) {
                // Abaikan error lainnya - tidak perlu hapus localStorage
                console.debug("Verifikasi instansi dilewati:", err.message);
            }
        };

        // Delay verifikasi agar token sudah ready
        const timer = setTimeout(verifyInstansiId, 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const fetchUserInstansi = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;
                
                const res = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                const userData = res.data;
                const userRole = userData?.role;
                const userInstansiId = userData?.instansi_id;
                const lastInstansiId = userData?.last_instansi_id;
                
                // For non-SUPER_ADMIN users, they are locked to their assigned instansi
                if (userRole && userRole !== 'SUPER_ADMIN' && userInstansiId) {
                    try {
                        // Verify the assigned instansi exists
                        await axios.get(API_ENDPOINTS.getInstansiById(userInstansiId), {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        // Always use the assigned instansi for non-SUPER_ADMIN users
                        setIdInstansi(userInstansiId);
                        localStorage.setItem('id_instansi', userInstansiId);
                        return;
                    } catch (err) {
                        console.warn("ID instansi yang ditetapkan untuk pengguna tidak valid");
                        // Don't set invalid instansi
                    }
                }
                
                // For SUPER_ADMIN or if assigned instansi is invalid
                if (lastInstansiId) {
                    // Verifikasi ID sebelum menyimpan
                    try {
                        await axios.get(API_ENDPOINTS.getInstansiById(lastInstansiId), {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setIdInstansi(lastInstansiId);
                        localStorage.setItem('id_instansi', lastInstansiId);
                    } catch (err) {
                        console.warn("ID instansi dari user preferences tidak valid");
                        // Jangan simpan ID yang tidak valid
                    }
                }
            } catch (err) {
                if (import.meta.env.MODE === 'development') {
                    console.error('[Dev] Gagal mengambil data instansi pengguna:', err);
                }
            }
        };

        if (!idInstansi) {
            fetchUserInstansi();
        }
    }, [idInstansi]);

    useEffect(() => {
        if (idInstansi) {
            localStorage.setItem('id_instansi', idInstansi);
            
            // When instansi changes, trigger induk unit kerja update
            const updateIndukUnitKerja = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    if (!token) return;
                    
                    // First try to use the check-work-unit endpoint which will select an appropriate unit
                    try {
                        await axios.post(
                            API_ENDPOINTS.checkWorkUnit,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        console.log("Successfully updated induk unit kerja via check-work-unit");
                    } catch (checkErr) {
                        console.warn("Failed to update induk unit kerja via check-work-unit, using fallback:", checkErr);
                        
                        // Instead of relying on IndukUnitKerjaContext, directly handle the selection here
                        await updateIndukUnitKerjaDirectly(idInstansi);
                    }
                } catch (err) {
                    console.error("Error updating induk unit kerja:", err);
                }
            };
            
            updateIndukUnitKerja();
        }
    }, [idInstansi]);

    // Direct implementation to update induk unit kerja without dependency on the context
    const updateIndukUnitKerjaDirectly = async (idInstansi) => {
        try {
            const token = localStorage.getItem('access_token');
            
            // Get current user information to check role and assigned units
            const userRes = await axios.get(API_ENDPOINTS.getCurrentUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const currentUser = userRes.data;
            const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
            const userIndukUnitKerjaIds = currentUser.induk_unit_kerja_ids || [];
            
            // Try to get induk unit kerja for the user's instansi
            let availableUnits = [];
            
            // First try with struktur organisasi endpoint (the main one used in UI)
            try {
                const res = await axios.get(API_ENDPOINTS.getStrukturOrganisasiAvailableIndukUnits(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                availableUnits = Array.isArray(res.data) ? res.data : [];
            } catch (err) {
                console.warn("Failed to fetch units via struktur-organisasi endpoint, trying fallback:", err);
                
                // Fallback to direct induk unit kerja endpoint
                try {
                    const res = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(idInstansi), {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    availableUnits = Array.isArray(res.data) ? res.data : [];
                } catch (fallbackErr) {
                    console.error("All attempts to fetch induk unit kerja failed:", fallbackErr);
                    return;
                }
            }
            
            if (availableUnits.length === 0) {
                localStorage.removeItem('id_induk_unit_kerja');
                return;
            }

            // Prefer to use the last_induk_unit_kerja_id if it's in the available units
            let newIndukUnitId = null;
            
            if (currentUser.last_induk_unit_kerja_id) {
                const lastUnitInAvailable = availableUnits.find(
                    unit => unit.id === currentUser.last_induk_unit_kerja_id
                );
                
                if (lastUnitInAvailable) {
                    newIndukUnitId = currentUser.last_induk_unit_kerja_id;
                }
            }
            
            // If no last unit or it's not in available units, use the first available unit
            if (!newIndukUnitId && availableUnits.length > 0) {
                newIndukUnitId = availableUnits[0].id;
            }
            
            if (!newIndukUnitId) {
                localStorage.removeItem('id_induk_unit_kerja');
                return;
            }
            
            localStorage.setItem('id_induk_unit_kerja', newIndukUnitId);

            // Update preferensi pengguna tanpa peduli ada template atau tidak
            try {
                await axios.put(
                    API_ENDPOINTS.putUserPreferences(idInstansi, newIndukUnitId),
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("Gagal memperbarui preferensi pengguna:", err.response?.data || err.message);
            }

        } catch (err) {
            console.error("Gagal mengambil data induk unit kerja:", err);
            localStorage.removeItem('id_induk_unit_kerja');
        }
    };

    return (
        <InstansiContext.Provider value={{
            idInstansi,
            setIdInstansi,
        }}>
            {children}
        </InstansiContext.Provider>
    );
};

InstansiProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useInstansi = () => useContext(InstansiContext);
