// Use environment variable for API base URL, fallback to localhost for development
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const API_ENDPOINTS = {
  // Dashboard
  getTahun: (instansiId) =>
    `${API_BASE_URL}/api/v1/dashboard/years?id_instansi=${instansiId}`,
  getDashboard: (tahun, templateId) =>
    `${API_BASE_URL}/api/v1/dashboard/risk-matrix-data?tahun=${tahun}&template_id=${templateId}`,
  getRiskStats: (tahun, instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/dashboard/risk-stats?tahun=${tahun}&id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,

  // Notifications
  getNotifications: `${API_BASE_URL}/api/v1/notifications`,
  markNotificationAsRead: (id) =>
    `${API_BASE_URL}/api/v1/notifications/${id}/read`,
  markAllNotificationsAsRead: `${API_BASE_URL}/api/v1/notifications/read-all`,
  deleteNotification: (id) => `${API_BASE_URL}/api/v1/notifications/${id}`,

  // Laporan Kejadian
  generateAnonymousLink: () =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/generate-link`,
  verifyAnonymousLink: (referenceId) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/validate-token?reference_id=${referenceId}`,
  submitLaporanKejadian: (referenceId) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/submit?reference_id=${referenceId}`,
  getLaporanKejadian: `${API_BASE_URL}/api/v1/laporan-kejadian`,
  getLaporanKejadianById: (laporanId) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/${laporanId}`,
  approveLaporanKejadian: (laporanId) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/${laporanId}/approve`,
  rejectLaporanKejadian: (laporanId) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/${laporanId}/reject`,
  downloadLaporanKejadianPdf: (laporanId) =>
    `${API_BASE_URL}/api/v1/export/pdf/laporan-kejadian/${laporanId}`,
  getLaporanKejadianKriteriaOptions: (id_instansi, id_induk_unit_kerja) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/options/kriteria?id_instansi=${id_instansi}&id_induk_unit_kerja=${id_induk_unit_kerja}`,
  getLaporanKejadianKamusRisikoOptions: (id_instansi, id_induk_unit_kerja) =>
    `${API_BASE_URL}/api/v1/laporan-kejadian/options/kamus-risiko?id_instansi=${id_instansi}&id_induk_unit_kerja=${id_induk_unit_kerja}`,

  // Bowtie Visualization
  getBowtieVisualisasi: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/bowtie/visualisasi/${identifikasiId}`,

  // Pelaporan Risiko
  getPelaporanRisikoInstansi: `${API_BASE_URL}/api/v1/pelaporan-risiko/instansi`,
  getPelaporanRisikoIndukUnitKerja: (id_instansi) =>
    `${API_BASE_URL}/api/v1/pelaporan-risiko/induk-unit-kerja/${id_instansi}`,
  downloadIdentifikasiRisiko: (
    tahun,
    id_instansi,
    id_induk_unit_kerja,
    format = "pdf",
  ) =>
    `${API_BASE_URL}/api/v1/pelaporan-risiko/identifikasi-risiko?tahun=${tahun}&id_instansi=${id_instansi}${id_induk_unit_kerja ? `&id_induk_unit_kerja=${id_induk_unit_kerja}` : ""}&format=${format}`,

  // Monitoring Risiko
  getMonitoringRisiko: (tahun) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko?tahun=${tahun}`,
  getMonitoringRisikoById: (id) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko/${id}`,
  verifyMonitoringRisiko: (id, status) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko/${id}/verify?status=${status}`,
  postMonitoringRisiko: () => `${API_BASE_URL}/api/v1/monitoring-risiko`,
  editMonitoringRisiko: (id) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko/${id}/edit`,
  getMonitoringRisikoKriteriaOptions: (id_instansi, id_induk_unit_kerja) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko/options/kriteria?id_instansi=${id_instansi}${id_induk_unit_kerja ? `&id_induk_unit_kerja=${id_induk_unit_kerja}` : ""}`,
  getMonitoringRisikoPernyataanOptions: (
    id_instansi,
    tahun,
    id_induk_unit_kerja,
  ) =>
    `${API_BASE_URL}/api/v1/monitoring-risiko/options/kamus-risiko?id_instansi=${id_instansi}&tahun=${tahun}${id_induk_unit_kerja ? `&id_induk_unit_kerja=${id_induk_unit_kerja}` : ""}`,

  // Users
  users: `${API_BASE_URL}/api/v1/users/users`,
  getUsers: `${API_BASE_URL}/api/v1/users/users`,
  registerUser: `${API_BASE_URL}/api/v1/users/register`,
  authLogin: `${API_BASE_URL}/api/v1/users/login`,
  getCurrentUser: `${API_BASE_URL}/api/v1/users/me`,
  updateSelfProfile: `${API_BASE_URL}/api/v1/users/update-profile`,
  changePassword: `${API_BASE_URL}/api/v1/users/me/change-password`,
  getAllUsers: `${API_BASE_URL}/api/v1/users/users`,
  getUsersByInstansi: (instansiId) =>
    `${API_BASE_URL}/api/v1/users/users?instansi_id=${instansiId}`,
  getUserById: (userId) => `${API_BASE_URL}/api/v1/users/users/${userId}`,
  updateUser: (userId) => `${API_BASE_URL}/api/v1/users/${userId}`,
  deleteUser: (userId) => `${API_BASE_URL}/api/v1/users/${userId}`,
  getUserPermissions: (userId) =>
    `${API_BASE_URL}/api/v1/users/${userId}/permissions`,
  putUserPreferences: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/users/me/preferences?last_instansi_id=${instansiId}&last_induk_unit_kerja_id=${indukUnitKerjaId}`,
  checkWorkUnit: `${API_BASE_URL}/api/v1/users/me/check-work-unit`,
  checkEmail: (email) =>
    `${API_BASE_URL}/api/v1/users/check-email?email=${email}`,

  // Instansi
  postInstansi: `${API_BASE_URL}/api/v1/instansi`,
  getInstansi: `${API_BASE_URL}/api/v1/instansi`,
  getAllInstansi: `${API_BASE_URL}/api/v1/instansi`,
  getInstansiById: (instansiId) =>
    `${API_BASE_URL}/api/v1/instansi/${instansiId}`,
  updateInstansi: (instansiId) =>
    `${API_BASE_URL}/api/v1/instansi/${instansiId}`,
  deleteInstansi: (instansiId) =>
    `${API_BASE_URL}/api/v1/instansi/${instansiId}`,

  // Induk Unit Kerja
  postIndukUnitKerja: `${API_BASE_URL}/api/v1/induk-unit-kerja`,
  getIndukUnitKerjaAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/induk-unit-kerja/all/${instansiId}`,
  getIndukUnitKerjaByInstansiId: (instansiId) =>
    `${API_BASE_URL}/api/v1/induk-unit-kerja/by-instansi/${instansiId}`,
  getIndukUnitKerjaById: (indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/induk-unit-kerja/${indukUnitKerjaId}`,
  updateIndukUnitKerja: (indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/induk-unit-kerja/${indukUnitKerjaId}`,
  deleteIndukUnitKerja: (indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/induk-unit-kerja/${indukUnitKerjaId}`,

  // Struktur Organisasi
  postStrukturOrganisasi: `${API_BASE_URL}/api/v1/struktur-organisasi`,
  getStrukturOrganisasibyInstansi: (instansiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi?id_instansi=${instansiId}`,
  getStrukturOrganisasi: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getStrukturOrganisasiAvailableIndukUnits: (instansiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/available-induk-units/${instansiId}`,
  getStrukturOrganisasiById: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}`,
  updateStrukturOrganisasi: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}`,
  deleteStrukturOrganisasi: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}`,
  getStrukturOrganisasiAssignUsers: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/users`,
  postStrukturOrganisasiAssignUsers: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/assign-users`,
  getStrukturOrganisasiJenisKonteks: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/jenis-konteks`,
  postStrukturOrganisasiJenisKonteks: (strukturOrganisasiId) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/jenis-konteks`,
  getStrukturOrganisasiJenisKonteksById: (
    strukturOrganisasiId,
    jenisKonteksId,
  ) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/jenis-konteks/${jenisKonteksId}`,
  putStrukturOrganisasiJenisKonteksById: (
    strukturOrganisasiId,
    jenisKonteksId,
  ) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/jenis-konteks/${jenisKonteksId}`,
  deleteStrukturOrganisasiJenisKonteksById: (
    strukturOrganisasiId,
    jenisKonteksId,
  ) =>
    `${API_BASE_URL}/api/v1/struktur-organisasi/${strukturOrganisasiId}/jenis-konteks/${jenisKonteksId}`,

  // Kategori Risiko
  postKategoriRisiko: `${API_BASE_URL}/api/v1/kategori-risiko`,
  getKategoriRisikoAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/kategori-risiko?id_instansi=${instansiId}`,
  getKategoriRisikoByInstansiAndIndukUnitKerja: (
    instansiId,
    indukUnitKerjaId,
  ) =>
    `${API_BASE_URL}/api/v1/kategori-risiko?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKategoriRisikoByKLP: (instansiId, namaKLP) =>
    `${API_BASE_URL}/api/v1/kategori-risiko?id_instansi=${instansiId}&search=${namaKLP}`,
  getKategoriRisikoById: (kategoriRisikoId) =>
    `${API_BASE_URL}/api/v1/kategori-risiko/${kategoriRisikoId}`,
  updateKategoriRisiko: (kategoriRisikoId) =>
    `${API_BASE_URL}/api/v1/kategori-risiko/${kategoriRisikoId}`,
  deleteKategoriRisiko: (kategoriRisikoId) =>
    `${API_BASE_URL}/api/v1/kategori-risiko/${kategoriRisikoId}`,

  // Jenis Konteks
  postJenisKonteks: `${API_BASE_URL}/api/v1/jenis-konteks`,
  getJenisKonteksAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/jenis-konteks?id_instansi=${instansiId}`,
  getJenisKonteksById: (jenisKonteksId) =>
    `${API_BASE_URL}/api/v1/jenis-konteks/${jenisKonteksId}`,
  updateJenisKonteks: (jenisKonteksId) =>
    `${API_BASE_URL}/api/v1/jenis-konteks/${jenisKonteksId}`,
  deleteJenisKonteks: (jenisKonteksId) =>
    `${API_BASE_URL}/api/v1/jenis-konteks/${jenisKonteksId}`,

  // Jenis Penyebab
  postJenisPenyebab: `${API_BASE_URL}/api/v1/jenis-penyebab`,
  getJenisPenyebabAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/jenis-penyebab?id_instansi=${instansiId}`,
  getJenisPenyebabByInstansiAndIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/jenis-penyebab?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getJenisPenyebabById: (jenisPenyebabId) =>
    `${API_BASE_URL}/api/v1/jenis-penyebab/${jenisPenyebabId}`,
  updateJenisPenyebab: (jenisPenyebabId) =>
    `${API_BASE_URL}/api/v1/jenis-penyebab/${jenisPenyebabId}`,
  deleteJenisPenyebab: (jenisPenyebabId) =>
    `${API_BASE_URL}/api/v1/jenis-penyebab/${jenisPenyebabId}`,

  // Konteks
  getKonteksAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}`,
  getKonteksByJenis: (instansiId, jenisKonteksId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}&id_jenis_konteks=${jenisKonteksId}`,

  // Konteks SASARAN
  postKonteksSasaran: `${API_BASE_URL}/api/v1/konteks`,
  getKonteksSasaranAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}&jenis=SASARAN`,
  getKonteksSasaranByIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}&jenis=SASARAN&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKonteksSasaranById: (konteksSasaranId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksSasaranId}`,
  updateKonteksSasaran: (konteksSasaranId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksSasaranId}`,
  deleteKonteksSasaran: (konteksSasaranId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksSasaranId}`,

  // Konteks PROBIS
  postKonteksProbis: `${API_BASE_URL}/api/v1/konteks`,
  getKonteksProbisAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}&jenis=PROBIS`,
  getKonteksProbisByIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/konteks?id_instansi=${instansiId}&jenis=PROBIS&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKonteksProbisById: (konteksProbisId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksProbisId}`,
  putKonteksProbis: (konteksProbisId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksProbisId}`,
  deleteKonteksProbis: (konteksProbisId) =>
    `${API_BASE_URL}/api/v1/konteks/${konteksProbisId}`,

  // Indikator
  postIndikator: `${API_BASE_URL}/api/v1/indikator`,
  getIndikator: (instansiId) =>
    `${API_BASE_URL}/api/v1/indikator?id_instansi=${instansiId}`,
  getIndikatorAll: (konteksId, instansiId) =>
    `${API_BASE_URL}/api/v1/indikator?id_konteks=${konteksId}&id_instansi=${instansiId}`,
  getIndikatorByIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/indikator?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getIndikatorById: (indikatorId) =>
    `${API_BASE_URL}/api/v1/indikator/${indikatorId}`,
  putIndikator: (indikatorId) =>
    `${API_BASE_URL}/api/v1/indikator/${indikatorId}`,
  deleteIndikator: (indikatorId) =>
    `${API_BASE_URL}/api/v1/indikator/${indikatorId}`,
  approveIndikator: (indikatorId) =>
    `${API_BASE_URL}/api/v1/indikator/${indikatorId}/approve`,

  // Kamus Risiko
  postKamusRisiko: `${API_BASE_URL}/api/v1/kamus-risiko`,
  getKamusRisikoAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/kamus-risiko?id_instansi=${instansiId}`,
  getKamusRisikoByIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/kamus-risiko?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKamusRisikoById: (kamusRisikoId) =>
    `${API_BASE_URL}/api/v1/kamus-risiko/${kamusRisikoId}`,
  putKamusRisiko: (kamusRisikoId) =>
    `${API_BASE_URL}/api/v1/kamus-risiko/${kamusRisikoId}`,
  deleteKamusRisiko: (kamusRisikoId) =>
    `${API_BASE_URL}/api/v1/kamus-risiko/${kamusRisikoId}`,

  // Bagan Risiko
  postBaganRisiko: `${API_BASE_URL}/api/v1/bagan-risiko`,
  getBaganRisikoAll: (instansiId, tahun) =>
    `${API_BASE_URL}/api/v1/bagan-risiko?id_instansi=${instansiId}&tahun=${tahun}`,
  getBaganRisikoByIndukUnitKerja: (instansiId, tahun, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/bagan-risiko?id_instansi=${instansiId}&tahun=${tahun}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getBaganRisikoById: (baganRisikoId) =>
    `${API_BASE_URL}/api/v1/bagan-risiko/${baganRisikoId}`,
  putBaganRisiko: (baganRisikoId) =>
    `${API_BASE_URL}/api/v1/bagan-risiko/${baganRisikoId}`,
  deleteBaganRisiko: (baganRisikoId) =>
    `${API_BASE_URL}/api/v1/bagan-risiko/${baganRisikoId}`,

  // Metode SPIP
  postMetodeSpip: `${API_BASE_URL}/api/v1/metode-spip`,
  getMetodeSpipAll: (instansiId, tahun) =>
    `${API_BASE_URL}/api/v1/metode-spip?id_instansi=${instansiId}&tahun=${tahun}`,
  getMetodeSpipByIndukUnitKerja: (instansiId, tahun, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/metode-spip?id_instansi=${instansiId}&tahun=${tahun}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getMetodeSpipById: (metodeSpipId) =>
    `${API_BASE_URL}/api/v1/metode-spip/${metodeSpipId}`,
  updatMetodeSpip: (metodeSpipId) =>
    `${API_BASE_URL}/api/v1/metode-spip/${metodeSpipId}`,
  deleteMetodeSpip: (metodeSpipId) =>
    `${API_BASE_URL}/api/v1/metode-spip/${metodeSpipId}`,

  // Identifikasi Risiko
  postIdentifikasiRisiko: `${API_BASE_URL}/api/v1/identifikasi-risiko`,
  getIdentifikasiRisikoAll: (instansiId, tahun) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko?tahun=${tahun}&id_instansi=${instansiId}`,
  postIdentifikasiRisikoSubmit: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}/submit`,
  postIdentifikasiRisikoApprove: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}/approve`,
  postIdentifikasiRisikoEnable: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}/enable`,
  postIdentifikasiRisikoDisable: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}/disable`,
  getIdentifikasiRisikoById: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}`,
  updateIdentifikasiRisiko: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}`,
  deleteIdentifikasiRisiko: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/${identifikasiId}`,
  postIdentifikasiRisikoGenerate: `${API_BASE_URL}/api/v1/identifikasi-risiko/generate-statements`,
  postIdentifikasiRisikoSelect: `${API_BASE_URL}/api/v1/identifikasi-risiko/select-statements`,
  deleteIdentifikasiRisikoGeneration: (generationId) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/cleanup-generation/${generationId}`,
  getIdentifikasiRisikoSummary: (instansiId, tahun) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/summary?tahun=${tahun}&id_instansi=${instansiId}`,
  getIdentifikasiRisikoSummaryByIdentifikasi: (
    instansiId,
    indukUnitKerjaId,
    tahun,
  ) =>
    `${API_BASE_URL}/api/v1/identifikasi-risiko/summary?tahun=${tahun}&id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,

  // Komentar
  postKomentar: `${API_BASE_URL}/api/v1/komentar`,
  getKomentarByRefId: (refId, tipeKomentar, tahun) =>
    `${API_BASE_URL}/api/v1/komentar/${refId}?tipe_komentar=${tipeKomentar}${tahun ? `&tahun=${tahun}` : ""}`,
  getKomentarByRefIdAndStatus: (refId, tipeKomentar, tahun, status) =>
    `${API_BASE_URL}/api/v1/komentar/${refId}?tipe_komentar=${tipeKomentar}${tahun ? `&tahun=${tahun}` : ""}${status ? `&status=${status}` : ""}`,
  updateKomentar: (komentarId) =>
    `${API_BASE_URL}/api/v1/komentar/${komentarId}`,
  deleteKomentar: (komentarId) =>
    `${API_BASE_URL}/api/v1/komentar/${komentarId}`,
  postKomentarReply: `${API_BASE_URL}/api/v1/komentar/reply`,
  updateKomentarStatus: (komentarId) =>
    `${API_BASE_URL}/api/v1/komentar/${komentarId}/status`,

  // Kriteria Risiko
  postKriteriaRisikoKemungkinan: `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan`,
  getKriteriaRisikoKemungkinanAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${instansiId}`,
  getKriteriaRisikoKemungkinanByIndukUnitKerja: (
    instansiId,
    indukUnitKerjaId,
  ) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKriteriaRisikoKemungkinanByTemplate: (
    instansiId,
    indukUnitKerjaId,
    templateId,
  ) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}&template_id=${templateId}&sync=true`,
  getKriteriaRisikoKemungkinanById: (kemungkinanId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan/${kemungkinanId}`,
  putKriteriaRisikoKemungkinan: (kemungkinanId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan/${kemungkinanId}`,
  deleteKriteriaRisikoKemungkinan: (kemungkinanId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/kemungkinan/${kemungkinanId}`,
  postKriteriaRisikoDampak: `${API_BASE_URL}/api/v1/kriteria-risiko/dampak`,
  getKriteriaRisikoDampakAll: (instansiId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak?id_instansi=${instansiId}`,
  getKriteriaRisikoDampakByIndukUnitKerja: (instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getKriteriaRisikoDampakByTemplate: (
    instansiId,
    indukUnitKerjaId,
    templateId,
  ) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak?id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}&template_id=${templateId}&sync=true`,
  getKriteriaRisikoDampakById: (dampakId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak/${dampakId}`,
  putKriteriaRisikoDampak: (dampakId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak/${dampakId}`,
  deleteKriteriaRisikoDampak: (dampakId) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/dampak/${dampakId}`,
  syncKriteriaRisikoFromTemplate: (
    id_instansi,
    id_induk_unit_kerja,
    template_id,
  ) =>
    `${API_BASE_URL}/api/v1/kriteria-risiko/sync-from-template?id_instansi=${id_instansi}&id_induk_unit_kerja=${id_induk_unit_kerja}&template_id=${template_id}`,
  getKriteriaRisikoAll: (instansiId, indukUnitKerjaId, templateId, sync) => {
    let url = `${API_BASE_URL}/api/v1/kriteria-risiko/all?id_instansi=${instansiId}`;
    if (indukUnitKerjaId) url += `&id_induk_unit_kerja=${indukUnitKerjaId}`;
    if (templateId) url += `&template_id=${templateId}`;
    if (sync) url += `&sync=true`;
    return url;
  },

  // Analisis Risiko
  postAnalisisRisiko: `${API_BASE_URL}/api/v1/analisis-risiko`,
  getAnalisisRisikoByTahun: (tahun) =>
    `${API_BASE_URL}/api/v1/analisis-risiko?tahun=${tahun}`,
  getAnalisisRisikoByIdentifikasiRisikoIdTahun: (identifikasiRisikoId, tahun) =>
    `${API_BASE_URL}/api/v1/analisis-risiko?tahun=${tahun}&identifikasi_risiko_id=${identifikasiRisikoId}`,
  getAnalisisRisikoById: (analisisRisikoId, tahun) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}?tahun=${tahun}`,
  updateAnalisisRisikoById: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}`,
  deleteAnalisisRisikoById: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}`,
  getAnalisisRisikoByIdentifikasiRisikoId: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/by-identifikasi/${identifikasiRisikoId}`,
  postAnalisisRisikoAttachment: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/attachments`,
  getAnalisisRisikoAttachment: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/attachments`,
  getAnalisisRisikoAttachmentDownload: (attachmentId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/attachments/${attachmentId}/download`,
  deleteAnalisisRisikoAttachment: (attachmentId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/attachments/${attachmentId}`,
  updateAnalisisRisikoAttachment: (attachmentId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/attachments/${attachmentId}`,
  getAnalisisRisikoInherent: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/inherit`,
  putAnalisisRisikoInherent: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/inherit`,
  getAnalisisRisikoResidual: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/residual`,
  putAnalisisRisikoResidual: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/residual`,
  getAnalisisRisikoTreated: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/treated`,
  putAnalisisRisikoTreated: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/treated`,
  getAnalisisRisikoActual: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/actual`,
  putAnalisisRisikoActual: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/actual`,
  getAnalisisRisikoMonitoringData: (analisisRisikoId, tahun) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/${analisisRisikoId}/monitoring-data${tahun ? `?tahun=${tahun}` : ""}`,
  postAnalisisRisikoPat: (tahun, instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/proses-akhir-tahun?tahun=${tahun}&id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  postAnalisisRisikoPatById: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/analisis-risiko/proses-akhir-tahun/${analisisRisikoId}`,

  // Evaluasi Risiko
  postEvaluasiRisiko: `${API_BASE_URL}/api/v1/evaluasi-risiko`,
  getEvaluasiRisikoAll: `${API_BASE_URL}/api/v1/evaluasi-risiko`,
  getEvaluasiRisikoByIdentifikasi: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko?identifikasi_risiko_id=${identifikasiRisikoId}`,
  getEvaluasiRisikoByIdentifikasiDampak: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/by-identifikasi/${identifikasiRisikoId}?jenis=dampak`,
  getEvaluasiRisikoByIdentifikasiPenyebab: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/by-identifikasi/${identifikasiRisikoId}?jenis=penyebab`,
  getEvaluasiRisikoByAnalisis: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko?analisis_risiko_id=${analisisRisikoId}`,
  getEvaluasiRisikoByIdentifikasiAnalisis: (
    identifikasiRisikoId,
    analisisRisikoId,
  ) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko?identifikasi_risiko_id=${identifikasiRisikoId}&analisis_risiko_id=${analisisRisikoId}`,
  getEvaluasiRisikoById: (evaluasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/${evaluasiRisikoId}`,
  putEvaluasiRisiko: (evaluasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/${evaluasiRisikoId}`,
  deleteEvaluasiRisikoById: (evaluasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/${evaluasiRisikoId}`,
  getEvaluasiRisikoByIdentifikasiSpes: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/by-identifikasi/${identifikasiRisikoId}`,
  getEvaluasiRisikoByAnalasisSpes: (analisisRisikoId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/by-analisis/${analisisRisikoId}`,
  postEvaluasiRisikoGenerate: `${API_BASE_URL}/api/v1/evaluasi-risiko/generate-root-causes`,
  postEvaluasiRisikoSelect: `${API_BASE_URL}/api/v1/evaluasi-risiko/select-root-cause`,
  deleteEvaluasiRisikoGeneration: (generationId) =>
    `${API_BASE_URL}/api/v1/evaluasi-risiko/cleanup-generation/${generationId}`,

  // Approval
  postApproval: `${API_BASE_URL}/api/v1/approval`,
  getAprrovalAll: `${API_BASE_URL}/api/v1/approval`,
  getAprrovalByType: (type) => `${API_BASE_URL}/api/v1/approval?style=${type}`,
  getAprrovalByStatus: (status) =>
    `${API_BASE_URL}/api/v1/approval?status=${status}`,
  getAprrovalByTypeStatus: (type, status) =>
    `${API_BASE_URL}/api/v1/approval?style=${type}&status=${status}`,
  getApprovalById: (approvalId) =>
    `${API_BASE_URL}/api/v1/approval/${approvalId}`,
  updateApproval: (approvalId) =>
    `${API_BASE_URL}/api/v1/approval/${approvalId}`,

  // Monitoring
  postMonitoring: `${API_BASE_URL}/api/v1/monitoring`,
  getMonitoringbyTahun: (tahun) =>
    `${API_BASE_URL}/api/v1/monitoring?tahun=${tahun}`,
  getMonitoringbyBagan: (tahun, baganRisikoId) =>
    `${API_BASE_URL}/api/v1/monitoring?tahun=${tahun}&bagan_risiko_id=${baganRisikoId}`,
  getMonitoringbyStatus: (tahun, status) =>
    `${API_BASE_URL}/api/v1/monitoring?tahun=${tahun}&status=${status}`,
  getMonitoringbyBaganStatus: (tahun, baganRisikoId, status) =>
    `${API_BASE_URL}/api/v1/monitoring?tahun=${tahun}&bagan_risiko_id=${baganRisikoId}&status=${status}`,
  getMonitoringById: (monitoringId) =>
    `${API_BASE_URL}/api/v1/monitoring/${monitoringId}`,
  updateMonitoring: (monitoringId) =>
    `${API_BASE_URL}/api/v1/monitoring/${monitoringId}`,
  deleteMonitoring: (monitoringId) =>
    `${API_BASE_URL}/api/v1/monitoring/${monitoringId}`,
  postMonitoringVerify: (monitoringId, status) =>
    `${API_BASE_URL}/api/v1/monitoring/${monitoringId}/verify?status=${status}`,

  // RTP
  postRtp: `${API_BASE_URL}/api/v1/rtp`,
  getRtpall: `${API_BASE_URL}/api/v1/rtp`,
  getRtpbyIdentifikasi: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/rtp/by-identifikasi/${identifikasiRisikoId}`,
  getRtpFrekuensiByIdentifikasi: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/rtp/by-identifikasi/${identifikasiRisikoId}?respon_risiko=REDUCE_FREQUENCY`,
  getRtpDampakByIdentifikasi: (identifikasiRisikoId) =>
    `${API_BASE_URL}/api/v1/rtp/by-identifikasi/${identifikasiRisikoId}?respon_risiko=REDUCE_IMPACT`,
  getRtpbyEvaluasi: (evaluasiRisikoId) =>
    `${API_BASE_URL}/api/v1/rtp?evaluasi_risiko_id=${evaluasiRisikoId}`,
  getRtpById: (rtpId) => `${API_BASE_URL}/api/v1/rtp/${rtpId}`,
  putRtp: (rtpId) => `${API_BASE_URL}/api/v1/rtp/${rtpId}`,
  deleteRtp: (rtpId) => `${API_BASE_URL}/api/v1/rtp/${rtpId}`,
  postRtpVerify: (rtpId) => `${API_BASE_URL}/api/v1/rtp/${rtpId}/verify`,
  postRtpFromEvaluasi: (evaluasiRisikoId) =>
    `${API_BASE_URL}/api/v1/rtp/from-evaluasi/${evaluasiRisikoId}`,
  postRtpBowtieAnalysis: (identifikasiId) =>
    `${API_BASE_URL}/api/v1/rtp/bulk-create/identifikasi/${identifikasiId}`,
  postRtpAttachment: (rtpId) =>
    `${API_BASE_URL}/api/v1/rtp/${rtpId}/attachments`,
  getRtpAttachment: (rtpId) =>
    `${API_BASE_URL}/api/v1/rtp/${rtpId}/attachments`,
  getRtpAttachmentDownload: (rtpId) =>
    `${API_BASE_URL}/api/v1/rtp/attachments/${rtpId}/download`,
  deleteRtpAttachment: (rtpId) =>
    `${API_BASE_URL}/api/v1/rtp/attachments/${rtpId}`,

  // Peta Risiko
  postPetaTemplate: (tahun, instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/generate?tahun=${tahun}&id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getPetaTemplate: (tahun) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template?tahun=${tahun}`,
  getPetaTemplateByIndukUnitKerjaId: (tahun, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template?tahun=${tahun}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getPetaTemplateById: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/${templateId}`,
  putPetaTemplateById: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/${templateId}`,
  putPetaTemplateSelera: (templateId, inputSelera) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/${templateId}/selera-risiko?selera_risiko=${inputSelera}`,
  // Template Examples - Salin Template
  getPetaTemplateExamples: () =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/examples`,
  postPetaTemplateCopy: (templateId, indukUnitKerjaId, tahun) =>
    `${API_BASE_URL}/api/v1/peta-risiko/template/${templateId}/copy?id_induk_unit_kerja=${indukUnitKerjaId}&tahun=${tahun}`,
  postPetaKategori: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori?template_id=${templateId}`,
  getPetaKategoriFrekuensi: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori?template_id=${templateId}&jenis=FREKUENSI`,
  getPetaKategoriDampak: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori?template_id=${templateId}&jenis=DAMPAK`,
  getPetaKategoriById: (kategoriId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori/${kategoriId}`,
  putPetaKategori: (kategoriId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori/${kategoriId}`,
  deletePetaKategori: (kategoriId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/kategori/${kategoriId}`,
  postPetaKlasifikasi: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi?template_id=${templateId}`,
  getPetaKlasifikasiFrekuensi: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi?template_id=${templateId}&jenis=FREKUENSI`,
  getPetaKlasifikasiDampak: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi?template_id=${templateId}&jenis=DAMPAK`,
  getPetaKlasifikasiById: (klasifikasiId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi/${klasifikasiId}`,
  putPetaKlasifikasi: (klasifikasiId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi/${klasifikasiId}`,
  deletePetaKlasifikasi: (klasifikasiId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/klasifikasi/${klasifikasiId}`,
  postPetaMatriks: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/matriks?template_id=${templateId}`,
  getPetaMatriks: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/matriks?template_id=${templateId}`,
  getPetaMatriksById: (matriksId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/matriks/${matriksId}`,
  putPetaMatriks: (matriksId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/matriks/${matriksId}`,
  deletePetaMatriks: (matriksId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/matriks/${matriksId}`,
  postPetaHeatmap: (templateId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap?template_id=${templateId}`,
  getPetaHeatmapTahun: (templateId, tahun) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap?template_id=${templateId}&tahun=${tahun}`,
  getPetaHeatmapAnalisis: (templateId, tahun) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap/analisis?template_id=${templateId}&tahun=${tahun}`,
  getPetaHeatmapAnalisisInstansi: (templateId, tahun, instansiId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap/analisis?template_id=${templateId}&tahun=${tahun}&id_instansi=${instansiId}`,
  getPetaHeatmapById: (heatmpaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap/${heatmpaId}`,
  putPetaHeatmap: (heatmpaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap/${heatmpaId}`,
  deletePetaHeatmap: (heatmpaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/heatmap/${heatmpaId}`,
  getPetaView: (tahun, instansiId, indukUnitKerjaId) =>
    `${API_BASE_URL}/api/v1/peta-risiko/view?tahun=${tahun}&id_instansi=${instansiId}&id_induk_unit_kerja=${indukUnitKerjaId}`,
  getPetaRisksByCell: (
    tahun,
    frekuensi,
    dampak,
    idInstansi,
    idIndukUnitKerja,
  ) => {
    let url = `${API_BASE_URL}/api/v1/peta-risiko/cell-risks?tahun=${tahun}&frekuensi=${frekuensi}&dampak=${dampak}`;
    if (idInstansi) url += `&id_instansi=${idInstansi}`;
    if (idIndukUnitKerja) url += `&id_induk_unit_kerja=${idIndukUnitKerja}`;
    return url;
  },

  // Groups
  groups: `${API_BASE_URL}/api/v1/groups`,
  createGroup: `${API_BASE_URL}/api/v1/groups`,
  getGroups: `${API_BASE_URL}/api/v1/groups`,
  getGroupById: (groupId) => `${API_BASE_URL}/api/v1/groups/${groupId}`,
  updateGroup: (groupId) => `${API_BASE_URL}/api/v1/groups/${groupId}`,
  deleteGroup: (groupId) => `${API_BASE_URL}/api/v1/groups/${groupId}`,
  addMemberToGroup: (groupId, userId) =>
    `${API_BASE_URL}/api/v1/groups/${groupId}/members/${userId}`,
  removeMemberFromGroup: (groupId, userId) =>
    `${API_BASE_URL}/api/v1/groups/${groupId}/members/${userId}`,

  // Roles (Peran) - Manage permissions for built-in roles
  roles: `${API_BASE_URL}/api/v1/roles`,
  getRolePermissions: (roleName) =>
    `${API_BASE_URL}/api/v1/roles/${roleName}/permissions`,
  updateRolePermissions: (roleName) =>
    `${API_BASE_URL}/api/v1/roles/${roleName}/permissions`,
  resetRolePermissions: (roleName) =>
    `${API_BASE_URL}/api/v1/roles/${roleName}/permissions`,

  // Audit Trail (like AWS CloudTrail)
  getAuditLogs: `${API_BASE_URL}/api/v1/audit-trail/logs`,
  getAuditLogById: (logId) =>
    `${API_BASE_URL}/api/v1/audit-trail/logs/${logId}`,
  getAuditSummary: `${API_BASE_URL}/api/v1/audit-trail/summary`,
  getMyActivity: `${API_BASE_URL}/api/v1/audit-trail/my-activity`,
  getResourceHistory: (resourceType, resourceId) =>
    `${API_BASE_URL}/api/v1/audit-trail/resource/${resourceType}/${resourceId}`,
  getAuditActions: `${API_BASE_URL}/api/v1/audit-trail/actions`,
  getAuditResourceTypes: `${API_BASE_URL}/api/v1/audit-trail/resource-types`,
  cleanupAuditLogs: `${API_BASE_URL}/api/v1/audit-trail/cleanup`,
};

export default API_ENDPOINTS;
