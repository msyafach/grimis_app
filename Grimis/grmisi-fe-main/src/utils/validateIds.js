import axios from 'axios';
import API_ENDPOINTS from '../config/apiConfig';

/**
 * Validates the instansi ID by checking if it exists in the database
 * @param {string} instansiId - The ID of the instansi to validate
 * @param {string} token - Authorization token
 * @returns {Promise<{valid: boolean, message: string}>} - Object containing validation result
 */
export const validateInstansiId = async (instansiId, token) => {
    if (!instansiId) {
        return { valid: false, message: "Instansi belum dipilih" };
    }

    try {
        await axios.get(API_ENDPOINTS.getInstansiById(instansiId), {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { valid: true, message: "" };
    } catch (err) {
        console.error("Instansi ID tidak valid:", err);
        // Clear invalid ID from localStorage
        localStorage.removeItem('id_instansi');
        return { valid: false, message: "Instansi tidak ditemukan di database" };
    }
};

/**
 * Validates the induk unit kerja ID by checking if it exists in the database
 * @param {string} indukUnitKerjaId - The ID of the induk unit kerja to validate
 * @param {string} token - Authorization token
 * @returns {Promise<{valid: boolean, message: string}>} - Object containing validation result
 */
export const validateIndukUnitKerjaId = async (indukUnitKerjaId, token) => {
    if (!indukUnitKerjaId) {
        return { valid: false, message: "Induk unit kerja belum dipilih" };
    }

    try {
        await axios.get(API_ENDPOINTS.getIndukUnitKerjaById(indukUnitKerjaId), {
            headers: { Authorization: `Bearer ${token}` }
        });
        return { valid: true, message: "" };
    } catch (err) {
        console.error("Induk Unit Kerja ID tidak valid:", err);
        // Clear invalid ID from localStorage
        localStorage.removeItem('id_induk_unit_kerja');
        return { valid: false, message: "Induk unit kerja tidak ditemukan di database" };
    }
};

/**
 * Validates both instansi and induk unit kerja IDs
 * @param {string} instansiId - The ID of the instansi to validate
 * @param {string} indukUnitKerjaId - The ID of the induk unit kerja to validate
 * @param {string} token - Authorization token
 * @returns {Promise<{valid: boolean, message: string}>} - Object containing validation result
 */
export const validateIds = async (instansiId, indukUnitKerjaId, token) => {
    // Validate instansi ID first
    const instansiResult = await validateInstansiId(instansiId, token);
    if (!instansiResult.valid) {
        return instansiResult;
    }

    // Then validate induk unit kerja ID
    const indukUnitResult = await validateIndukUnitKerjaId(indukUnitKerjaId, token);
    if (!indukUnitResult.valid) {
        return indukUnitResult;
    }

    // Additional validation to check if induk unit kerja belongs to instansi
    try {
        const indukUnitRes = await axios.get(API_ENDPOINTS.getIndukUnitKerjaById(indukUnitKerjaId), {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (indukUnitRes.data.id_instansi !== instansiId) {
            localStorage.removeItem('id_induk_unit_kerja');
            return { 
                valid: false, 
                message: "Induk unit kerja tidak terkait dengan instansi yang dipilih"
            };
        }
        
        return { valid: true, message: "" };
    } catch (err) {
        console.error("Gagal memvalidasi relasi induk unit kerja dan instansi:", err);
        return { valid: false, message: "Gagal memvalidasi data" };
    }
};

export default {
    validateInstansiId,
    validateIndukUnitKerjaId,
    validateIds
}; 