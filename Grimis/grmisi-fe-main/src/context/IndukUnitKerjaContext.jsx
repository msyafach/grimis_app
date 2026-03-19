import { createContext, useState, useContext, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { showToast } from '@/utils/toast';
import API_ENDPOINTS from '../config/apiConfig';
import { useTahun } from './TahunContext';

const IndukUnitKerjaContext = createContext();

export const IndukUnitKerjaProvider = ({ children }) => {
    const [idIndukUnitKerja, setIdIndukUnitKerja] = useState(() => {
        return localStorage.getItem('id_induk_unit_kerja') || '';
    });

    const [idTemplate, setIdTemplate] = useState(() => {
        return localStorage.getItem('id_template') || '';
    });

    const { tahunId, tahunList, fetchAvailableYears, setTahunId } = useTahun();

    // Verifikasi ID yang tersimpan di localStorage saat komponen dimount
    useEffect(() => {
        const verifyStoredIds = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;
                
                // Verifikasi ID Instansi
                const storedInstansiId = localStorage.getItem('id_instansi');
                if (storedInstansiId) {
                    try {
                        await axios.get(API_ENDPOINTS.getInstansiById(storedInstansiId), {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    } catch (err) {
                        // Hanya hapus jika error 404 (tidak ditemukan)
                        if (err.response && err.response.status === 404) {
                            console.warn("Instansi ID tidak valid, menghapus dari localStorage");
                            localStorage.removeItem('id_instansi');
                        }
                        // Biarkan jika network error atau lainnya
                    }
                }
                
                // Verifikasi ID Induk Unit Kerja
                if (idIndukUnitKerja) {
                    try {
                        await axios.get(API_ENDPOINTS.getIndukUnitKerjaById(idIndukUnitKerja), {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    } catch (err) {
                        // Hanya hapus jika error 404 (tidak ditemukan)
                        if (err.response && err.response.status === 404) {
                            console.warn("Induk Unit Kerja ID tidak valid, menghapus dari localStorage");
                            localStorage.removeItem('id_induk_unit_kerja');
                            setIdIndukUnitKerja('');
                        }
                        // Biarkan jika network error atau lainnya
                    }
                }
            } catch (err) {
                console.error("Gagal memverifikasi ID yang tersimpan:", err);
            }
        };
        
        verifyStoredIds();
    }, []);

    useEffect(() => {
        if (idIndukUnitKerja) {
            localStorage.setItem('id_induk_unit_kerja', idIndukUnitKerja);
        }
    }, [idIndukUnitKerja]);

    useEffect(() => {
        if (idTemplate) {
            localStorage.setItem('id_template', idTemplate);
        }
    }, [idTemplate]);

    useEffect(() => {
        const fetchLastIndukUnitKerja = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (!token) return;
                
                // Ensure we have an instansi ID before proceeding
                const storedInstansiId = localStorage.getItem('id_instansi');
                if (!storedInstansiId) {
                    console.warn("No instansi ID available, cannot fetch induk unit kerja");
                    return;
                }
                
                // First try to use the check-work-unit endpoint which handles validation 
                // and assignment of a suitable work unit
                try {
                    const workUnitCheckRes = await axios.post(
                        API_ENDPOINTS.checkWorkUnit, 
                        {}, 
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    const checkedUnit = workUnitCheckRes.data?.last_induk_unit_kerja_id;
                    
                    if (checkedUnit) {
                        console.log("Successfully obtained induk unit kerja from check-work-unit:", checkedUnit);
                        setIdIndukUnitKerja(checkedUnit);
                        localStorage.setItem('id_induk_unit_kerja', checkedUnit);
                        return;
                    }
                } catch (checkErr) {
                    // If check-work-unit fails, continue with fallback approach
                    console.warn("Failed to use check-work-unit endpoint, using fallback:", checkErr);
                }
                
                // Fallback to getting user data directly
                const res = await axios.get(API_ENDPOINTS.getCurrentUser, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                
                // Get user's instansi_id and role
                const userInstansiId = res.data?.instansi_id;
                const userRole = res.data?.role;
                const userIndukUnitKerjaIds = res.data?.induk_unit_kerja_ids || [];
                
                // If user has no instansi_id (except SUPER_ADMIN), they can't access any units
                if (!userInstansiId && userRole !== "SUPER_ADMIN") {
                    console.warn("User has no assigned institution");
                    return;
                }

                // If user has a last_induk_unit_kerja_id preference
                const lastId = res.data?.last_induk_unit_kerja_id;
                if (lastId) {
                    // For non-SUPER_ADMIN and non-ADMIN_KLP, verify the unit is in their assigned units
                    if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN_KLP" && !userIndukUnitKerjaIds.includes(lastId)) {
                        console.warn("Last used unit is not in user's assigned units");
                    } else {
                        // Verify the unit exists and is accessible
                        try {
                            await axios.get(API_ENDPOINTS.getIndukUnitKerjaById(lastId), {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            setIdIndukUnitKerja(lastId);
                            localStorage.setItem('id_induk_unit_kerja', lastId);
                            return;
                        } catch (err) {
                            console.warn("Last used unit is not accessible or doesn't exist");
                        }
                    }
                }

                // If no valid last unit, try to get available units for the user's instansi
                // First try the struktur-organisasi endpoint which is preferred
                try {
                    const unitsRes = await axios.get(
                        API_ENDPOINTS.getStrukturOrganisasiAvailableIndukUnits(storedInstansiId),
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const availableUnits = unitsRes.data;
                    if (availableUnits && availableUnits.length > 0) {
                        // For non-admin users, filter to their assigned units
                        let unitToUse;
                        if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN_KLP") {
                            unitToUse = availableUnits.find(unit => userIndukUnitKerjaIds.includes(unit.id));
                        } else {
                            unitToUse = availableUnits[0];
                        }

                        if (unitToUse) {
                            setIdIndukUnitKerja(unitToUse.id);
                            localStorage.setItem('id_induk_unit_kerja', unitToUse.id);
                            
                            // Also update user preferences on the server
                            try {
                                await axios.put(
                                    API_ENDPOINTS.putUserPreferences(storedInstansiId, unitToUse.id),
                                    {},
                                    { headers: { Authorization: `Bearer ${token}` } }
                                );
                                console.log("User preferences updated with new induk unit kerja:", unitToUse.id);
                            } catch (prefErr) {
                                console.warn("Failed to update user preferences:", prefErr);
                            }
                            
                            return;
                        }
                    }
                } catch (structErr) {
                    // If struktur-organisasi endpoint fails, try the direct induk unit kerja endpoint
                    console.warn("Failed to get units via struktur-organisasi, trying fallback:", structErr);
                    
                    try {
                        const directUnitsRes = await axios.get(
                            API_ENDPOINTS.getIndukUnitKerjaByInstansi(storedInstansiId),
                            { headers: { Authorization: `Bearer ${token}` } }
                        );

                        const directUnits = directUnitsRes.data;
                        if (directUnits && directUnits.length > 0) {
                            // For non-admin users, filter to their assigned units
                            let unitToUse;
                            if (userRole !== "SUPER_ADMIN" && userRole !== "ADMIN_KLP") {
                                unitToUse = directUnits.find(unit => userIndukUnitKerjaIds.includes(unit.id));
                            } else {
                                unitToUse = directUnits[0];
                            }

                            if (unitToUse) {
                                setIdIndukUnitKerja(unitToUse.id);
                                localStorage.setItem('id_induk_unit_kerja', unitToUse.id);
                                
                                // Also update user preferences on the server
                                try {
                                    await axios.put(
                                        API_ENDPOINTS.putUserPreferences(storedInstansiId, unitToUse.id),
                                        {},
                                        { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                } catch (prefErr) {
                                    console.warn("Failed to update user preferences:", prefErr);
                                }
                            }
                        }
                    } catch (directErr) {
                        console.error("All attempts to fetch induk unit kerja failed:", directErr);
                    }
                }
            } catch (err) {
                if (import.meta.env.MODE === 'development') {
                    console.error('[Dev] Failed to fetch last_induk_unit_kerja:', err);
                }
            }
        };

        if (!idIndukUnitKerja) {
            fetchLastIndukUnitKerja();
        }
    }, [idIndukUnitKerja]);

    useEffect(() => {
        const fetchTemplateByTahun = async () => {
            if (!tahunId || !idIndukUnitKerja) return;

            try {
                const token = localStorage.getItem('access_token');
                const tplRes = await axios.get(
                    API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahunId, idIndukUnitKerja),
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const templates = Array.isArray(tplRes.data)
                    ? tplRes.data
                    : tplRes.data?.data ?? [];

                if (templates.length > 0 && templates[0]?.id) {
                    const newTemplateId = templates[0].id;
                    setIdTemplate(newTemplateId);
                    localStorage.setItem('id_template', newTemplateId);
                } else {
                    setIdTemplate('');
                    localStorage.removeItem('id_template');
                    // showToast('warning', 'Template belum tersedia untuk tahun tersebut.');
                    return { success: false, message: "Template belum tersedia untuk unit kerja ini." };
                }
            } catch (err) {
                console.error("Gagal mengambil template saat tahun berubah:", err);
                setIdTemplate('');
                localStorage.removeItem('id_template');
                // showToast('error', 'Gagal memuat template untuk tahun baru.');
            }
        };

        fetchTemplateByTahun();
    }, [tahunId, idIndukUnitKerja]);

    const updateIndukUnitKerjaByInstansi = async (idInstansi) => {
        try {
            const token = localStorage.getItem('access_token');
            
            // Get current user information to check role and assigned units
            const userRes = await axios.get(API_ENDPOINTS.getCurrentUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const currentUser = userRes.data;
            const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
            const userIndukUnitKerjaIds = currentUser.induk_unit_kerja_ids || [];
            
            // Validasi instansi terlebih dahulu
            try {
                const instansiRes = await axios.get(API_ENDPOINTS.getInstansiById(idInstansi), {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (!instansiRes.data || !instansiRes.data.id) {
                    return { success: false, message: "Instansi tidak ditemukan di database." };
                }
                
                // Simpan ID instansi yang valid ke localStorage
                localStorage.setItem('id_instansi', idInstansi);
                
            } catch (err) {
                console.error("Gagal memvalidasi instansi:", err);
                localStorage.removeItem('id_instansi');
                return { success: false, message: "Instansi tidak valid atau tidak ditemukan di database." };
            }
            
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
                    return { success: false, message: "Gagal mengambil data induk unit kerja." };
                }
            }
            
            if (availableUnits.length === 0) {
                setIdIndukUnitKerja('');
                localStorage.removeItem('id_induk_unit_kerja');
                return { success: false, message: "Tidak ada induk unit kerja yang tersedia untuk Anda pada instansi ini." };
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
                return { success: false, message: "Induk unit kerja tidak ditemukan." };
            }
            
            // Skip additional validation since the endpoint already filters only valid units for the user
            setIdIndukUnitKerja(newIndukUnitId);
            localStorage.setItem('id_induk_unit_kerja', newIndukUnitId);

            // Lakukan pengecekan tahunId sebelum mengambil template
            if (tahunId) {
                try {
                    const tplRes = await axios.get(
                        API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahunId, newIndukUnitId),
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const templates = Array.isArray(tplRes.data)
                        ? tplRes.data
                        : tplRes.data?.data ?? [];

                    if (!templates.length || !templates[0]?.id) {
                        setIdTemplate('');
                        localStorage.removeItem('id_template');
                        // showToast('warning', 'Template belum tersedia untuk unit kerja ini.');
                        return { success: true, message: "Template belum tersedia untuk unit kerja ini." };
                    }

                    const newTemplateId = templates[0].id;
                    setIdTemplate(newTemplateId);
                    localStorage.setItem('id_template', newTemplateId);
                } catch (err) {
                    console.error("Gagal mengambil template:", err);
                    setIdTemplate('');
                    localStorage.removeItem('id_template');
                    return { success: true, message: "Template belum tersedia untuk unit kerja ini." };
                }
            } else {
                // Jika tidak ada tahunId, reset template saja tanpa throw error
                setIdTemplate('');
                localStorage.removeItem('id_template');
            }

            // Update preferensi pengguna tanpa peduli ada template atau tidak
            try {
                await axios.put(
                    API_ENDPOINTS.putUserPreferences(idInstansi, newIndukUnitId),
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            } catch (err) {
                console.error("Gagal memperbarui preferensi pengguna:", err.response?.data || err.message);
                // Tetap lanjutkan meskipun gagal update preferensi
                showToast('warning', 'Preferensi pengguna tidak dapat disimpan, tetapi aplikasi tetap berjalan.');
            }

            return { success: true };

        } catch (err) {
            console.error("Gagal mengambil data instansi:", err);
            setIdIndukUnitKerja('');
            setIdTemplate('');
            localStorage.removeItem('id_induk_unit_kerja');
            localStorage.removeItem('id_template');
            localStorage.removeItem('id_instansi');
            return { success: false, message: "Gagal mengambil data instansi awal." };
        }
    };

    return (
        <IndukUnitKerjaContext.Provider value={{
            idIndukUnitKerja,
            setIdIndukUnitKerja,
            idTemplate,
            setIdTemplate,
            updateIndukUnitKerjaByInstansi,
        }}>
            {children}
        </IndukUnitKerjaContext.Provider>
    );
};

IndukUnitKerjaProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useIndukUnitKerja = () => useContext(IndukUnitKerjaContext);
