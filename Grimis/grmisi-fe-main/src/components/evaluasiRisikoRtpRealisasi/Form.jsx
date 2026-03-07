import PropTypes from 'prop-types';
import { FiEdit, FiFile, FiFilePlus, FiInfo, FiRefreshCw, FiSettings } from 'react-icons/fi';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormEvaluasiRisikoRtp = ({
    evaluasiRisikoRtp,
    jenisPenyebab,
    selectedJenisPenyebab,
    formDataRtp,
    formDataEvaluasi,
    handleInput,
    handleInputEvaluasi,
    handleSelectChange,
    isByAIEvaluasi,
    setIsByAIEvaluasi,
    isByAI,
    setIsByAI,
    onGenerateForEntry,
    setShowUploadModal,
    setShowFileTabelModal
}) => {
    return (
        <>
            <div className="row">
                <div className="col-12 bg-light p-3 rounded-4 bg-light">
                    <h5 className="p-0">Informasi </h5>
                    <div className="m-2">
                        <h6 className="p-0">Analisis Risiko</h6>
                        <div className="m-2">
                            <strong>Sasaran {evaluasiRisikoRtp.konteks_sasaran.nama || '-'} | Probis {evaluasiRisikoRtp.konteks_probis.nama || '-'}</strong> <br />
                            <strong>Pernyataan Risiko:</strong> {evaluasiRisikoRtp.identifikasi.pernyataan_risiko} <br />
                            <strong>Deskripsi:</strong> {evaluasiRisikoRtp.identifikasi.deskripsi || '-'}<br />
                            <strong>Dampak:</strong> {evaluasiRisikoRtp.identifikasi.uraian_dampak || '-'}<br />
                        </div>
                        <h6 className="p-0">Evaluasi Risiko</h6>
                        <div className="m-2">
                            {evaluasiRisikoRtp.evaluasi?.jenis !== 'dampak' && (
                                <>
                                    <strong>Jenis Penyebab:</strong> {selectedJenisPenyebab?.label || '-'}<br />
                                </>
                            )}
                            <strong>Akar Penyebab:</strong> {formDataEvaluasi.deskripsi || '-'}<br />
                            <strong>Pengendalian:</strong> {formDataEvaluasi.pengendalian || '-'}<br />
                            <strong>Jenis Pengendalian:</strong> {formDataEvaluasi.jenis_pengendalian || '-'}<br />
                            <strong>RTP Count:</strong> {evaluasiRisikoRtp.evaluasi?.rtp_count ?? '-'}
                        </div>
                    </div>
                </div>

                {/* === Section: Risk Treatment Plan (RTP) === */}
                <div className="col-12 bg-light rounded-4 p-3 my-3">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <h5 className="mb-0">Risk Treatment Plan (RTP)</h5>
                    </div>
                </div>

                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="deskripsi"
                            placeholder="Deskripsi"
                            value={formDataRtp.deskripsi}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Respon Risiko <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="respon_risiko"
                            placeholder="Respon Risiko"
                            value={formDataRtp.respon_risiko}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Rencana Aksi <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="rencana_aksi"
                            placeholder="Rencana Aksi"
                            value={formDataRtp.rencana_aksi}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Penanggung Jawab <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="pic"
                            placeholder="Penanggung Jawab"
                            value={formDataRtp.pic}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Indikator <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="indikator"
                            placeholder="Indikator"
                            value={formDataRtp.indikator}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Output <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="output"
                            placeholder="Output"
                            value={formDataRtp.output}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Anggaran <span className="text-danger">*</span></label>
                        <input
                            type="number"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="anggaran"
                            placeholder="Anggaran"
                            value={formDataRtp.anggaran}
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Target Waktu <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="target_waktu"
                            placeholder="Target Waktu"
                            value={
                                formDataRtp.target_waktu
                                    ? new Date(formDataRtp.target_waktu).toLocaleString('id-ID', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })
                                    : ''
                            }
                            onChange={handleInput}
                            disabled
                        />
                    </div>
                </div>

                {/* === Section: Risk Treatment Plan (RTP) === */}
                <div className="col-12 bg-light rounded-4 p-3 my-3">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <h5 className="mb-0">Realisasi</h5>
                    </div>
                </div>

                <div className="col-3">
                    <div className="mb-4">
                        <label className="form-label">Tanggal Realisasi <span className="text-danger">*</span></label>
                        <input
                            type="datetime-local"
                            className="form-control form-control-sm rounded-4"
                            name="tanggal_realisasi"
                            placeholder="Tanggal Realisasi"
                            value={formDataRtp.tanggal_realisasi}
                            onChange={handleInput}
                            required
                        />
                    </div>
                </div>
                <div className="col-3">
                    <div className="mb-4">
                        <label className="form-label"><br /></label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="tanggal_realisasi"
                            placeholder="Tanggal Realisasi"
                            value={
                                formDataRtp.tanggal_realisasi
                                    ? new Date(formDataRtp.tanggal_realisasi).toLocaleString('id-ID', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                    })
                                    : ''
                            }
                            disabled
                        />
                    </div>
                </div>
                <div className="col-3 mb-4">
                    <label className="form-label">Durasi Pengendalian</label>
                    <input
                        type="text"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={
                            formDataRtp.created_at && formDataRtp.tanggal_realisasi
                                ? (() => {
                                    const start = new Date(formDataRtp.created_at); // Use created_at
                                    const end = new Date(formDataRtp.tanggal_realisasi); // Use tanggal_realisasi
                                    const diffMs = Math.abs(end - start);

                                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                                    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);

                                    return `${days} hari ${hours} jam ${minutes} menit`;
                                })()
                                : '-'
                        }
                        disabled
                    />
                </div>
                <div className="col-3 mb-4">
                    <label className="form-label">Status</label>
                    <div>
                        <span
                            className={`badge rounded-3 p-2 ${formDataRtp.target_waktu && formDataRtp.tanggal_realisasi
                                ? (() => {
                                    const targetDate = new Date(formDataRtp.target_waktu);
                                    const realisasiDate = new Date(formDataRtp.tanggal_realisasi);
                                    const isLate = realisasiDate > targetDate;

                                    if (isLate) {
                                        return 'bg-warning text-white';
                                    } else if (realisasiDate <= targetDate) {
                                        return 'bg-success text-white';
                                    }
                                    return 'bg-danger text-white';
                                })()
                                : 'bg-danger text-white'
                                }`}
                        >
                            {formDataRtp.target_waktu && formDataRtp.tanggal_realisasi
                                ? (() => {
                                    const targetDate = new Date(formDataRtp.target_waktu);
                                    const realisasiDate = new Date(formDataRtp.tanggal_realisasi);

                                    // Check if the realisasi date is after the target date
                                    const isLate = realisasiDate > targetDate;

                                    if (isLate) {
                                        return 'Terlambat';
                                    } else if (realisasiDate <= targetDate) {
                                        return 'Tepat Waktu';
                                    }
                                    return 'Belum Terealisasi';
                                })()
                                : 'Belum Terealisasi'}
                        </span>
                    </div>
                </div>


                <div className="col-12 mb-4">
                    <label className="form-label">Uraian Hambatan <span className="text-danger">*</span></label>
                    <textarea
                        name="uraian_hambatan"
                        rows={3}
                        placeholder="Uraian Hambatan"
                        className="form-control form-control-sm rounded-4"
                        value={formDataRtp.uraian_hambatan}
                        onChange={handleInput}
                    />
                </div>

                <div className="col-3 mb-4">
                    <label className="form-label">Berkas Count <span className="text-danger">*</span></label>
                    <input
                        type="number"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="attachments_count"
                        placeholder="Jumlah Berkas"
                        value={formDataRtp.attachments_count}
                        disabled
                    />
                </div>
                <div className="col-3 mb-4">
                    <label className="form-label"><br /></label>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                        >
                            <FiFilePlus size={16} className="me-2" />Tambah Berkas
                        </button>
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setShowFileTabelModal(true)}
                        >
                            <FiSettings size={16} className="me-2" />Kelola Berkas
                        </button>
                    </div>
                </div>

            </div >
        </>
    );
};


export default FormEvaluasiRisikoRtp;
