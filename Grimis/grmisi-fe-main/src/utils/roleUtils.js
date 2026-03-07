/**
 * Map of role values to their display labels
 */
export const roleLabels = {
  "SUPER_ADMIN": "Super Admin",
  "ADMIN_KLP": "Admin Organisasi",
  "UNIT_MANAJEMEN_RISIKO": "Unit Manajemen Risiko",
  "PEMILIK_RISIKO": "Pemilik Risiko",
  "PENGELOLA_RISIKO": "Pengelola Risiko",
  "PENGAWAS_INTERN": "Pengawas Intern",
  "PEGAWAI": "Pegawai"
};

/**
 * Converts a role value to its display label
 * @param {string} role - The role value (e.g., "ADMIN_KLP")
 * @returns {string} The display label (e.g., "Admin Organisasi")
 */
export const getRoleLabel = (role) => {
  return roleLabels[role] || role;
}; 