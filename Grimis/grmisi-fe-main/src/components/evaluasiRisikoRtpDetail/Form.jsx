import PropTypes from 'prop-types';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormEvaluasiRisikoRtp = ({
    evaluasiRisikoRtp,
    formDataRtp,
    formDataEvaluasi,
    handleInput,
    handleInputEvaluasi,
    handleSelectChange
}) => {
    return (
        <>
            <div className="row">
                <div className="col-12 bg-light p-4 rounded-4">
                    <h5 className="p-0">Informasi </h5>
                    <div className="m-2">
                        <strong>Sasaran {evaluasiRisikoRtp.konteks_sasaran.nama || '-'} | Probis {evaluasiRisikoRtp.konteks_probis.nama || '-'}</strong> <br />
                        <strong>Pernyataan Risiko:</strong> {evaluasiRisikoRtp.identifikasi.pernyataan_risiko} <br />
                        <strong>Deskripsi:</strong> {evaluasiRisikoRtp.identifikasi.deskripsi || '-'}<br />
                        <strong>Dampak:</strong> {evaluasiRisikoRtp.identifikasi.uraian_dampak || '-'}<br />
                    </div>
                </div>

                {/* === Section: Evaluasi Risiko === */}
                <div className="col-12 my-3">
                    <h5 className="mb-0">Evaluasi Risiko</h5>
                </div>
                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Akar Penyebab </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="deskripsi"
                            placeholder="Deskripsi"
                            value={evaluasiRisikoRtp.evaluasi.deskripsi}
                            disabled
                        />
                    </div>
                </div>
                {evaluasiRisikoRtp.evaluasi?.jenis !== 'dampak' && (
                    <>
                        <div className="col-6">
                            <div className="mb-4">
                                <label className="form-label">Jenis Penyebab</label>
                                <input
                                    type="text"
                                    className="form-control form-control-sm rounded-4 bg-light"
                                    name="jenis"
                                    placeholder="Jenis"
                                    value={evaluasiRisikoRtp.jenis_penyebab.nama}
                                    disabled
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Pengandalian </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="pengendalian"
                            placeholder="Pengandalian"
                            value={evaluasiRisikoRtp.evaluasi.pengendalian}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Jenis Pengendalian </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="jenis_pengendalian"
                            placeholder="Jenis Pengendalian"
                            value={evaluasiRisikoRtp.evaluasi.jenis_pengendalian}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">RTP Count </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="rtp_count"
                            placeholder="RTP Count"
                            value={evaluasiRisikoRtp.evaluasi.rtp_count}
                            disabled
                        />
                    </div>
                </div>

                {/* === Section: Risk Treatment Plan (RTP) === */}
                <div className="col-12 my-3">
                    <h5 className="mb-0">Risk Treatment Plan (RTP)</h5>
                </div>

                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Deskripsi </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="deskripsi"
                            placeholder="Deskripsi"
                            value={evaluasiRisikoRtp.deskripsi}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Respon Risiko </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="respon_risiko"
                            placeholder="Respon Risiko"
                            value={evaluasiRisikoRtp.respon_risiko}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-12">
                    <div className="mb-4">
                        <label className="form-label">Rencana Aksi </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="rencana_aksi"
                            placeholder="Rencana Aksi"
                            value={evaluasiRisikoRtp.rencana_aksi}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Penanggung Jawab </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="pic"
                            placeholder="Penanggung Jawab"
                            value={evaluasiRisikoRtp.pic}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Indikator </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="indikator"
                            placeholder="Indikator"
                            value={evaluasiRisikoRtp.indikator}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Output </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="output"
                            placeholder="Output"
                            value={evaluasiRisikoRtp.output}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Anggaran </label>
                        <input
                            type="number"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="anggaran"
                            placeholder="Anggaran"
                            value={evaluasiRisikoRtp.anggaran}
                            disabled
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Target Waktu </label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="target_waktu"
                            placeholder="Target Waktu"
                            value={
                                evaluasiRisikoRtp.target_waktu
                                    ? new Date(evaluasiRisikoRtp.target_waktu).toLocaleString('id-ID', {
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

                <div className="col-12 bg-light rounded-4 p-3 my-3">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <h5 className="mb-0">Realisasi</h5>
                    </div>
                </div>
                <div className="col-6">
                    <div className="mb-4">
                        <label className="form-label">Tanggal Realisasi</label>
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-4 bg-light"
                            name="tanggal_realisasi"
                            placeholder="Tanggal Realisasi"
                            value={
                                evaluasiRisikoRtp.tanggal_realisasi
                                    ? new Date(evaluasiRisikoRtp.tanggal_realisasi).toLocaleString('id-ID', {
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
                            evaluasiRisikoRtp.created_at && evaluasiRisikoRtp.tanggal_realisasi
                                ? (() => {
                                    const start = new Date(evaluasiRisikoRtp.created_at); // Use created_at
                                    const end = new Date(evaluasiRisikoRtp.tanggal_realisasi); // Use tanggal_realisasi
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
                            className={`badge rounded-3 p-2 ${evaluasiRisikoRtp.target_waktu && evaluasiRisikoRtp.tanggal_realisasi
                                ? (() => {
                                    const targetDate = new Date(evaluasiRisikoRtp.target_waktu);
                                    const realisasiDate = new Date(evaluasiRisikoRtp.tanggal_realisasi);
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
                            {evaluasiRisikoRtp.target_waktu && evaluasiRisikoRtp.tanggal_realisasi
                                ? (() => {
                                    const targetDate = new Date(evaluasiRisikoRtp.target_waktu);
                                    const realisasiDate = new Date(evaluasiRisikoRtp.tanggal_realisasi);

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
                    <label className="form-label">Uraian Hambatan</label>
                    <textarea
                        name="uraian_hambatan"
                        rows={3}
                        placeholder="Uraian Hambatan"
                        className="form-control form-control-sm rounded-4 bg-light"
                        value={evaluasiRisikoRtp.uraian_hambatan}
                        disabled
                    />
                </div>

                <div className="col-3 mb-4">
                    <label className="form-label">Berkas Count </label>
                    <input
                        type="number"
                        className="form-control form-control-sm rounded-4 bg-light"
                        name="attachments_count"
                        placeholder="Jumlah Berkas"
                        value={evaluasiRisikoRtp.attachments_count}
                        disabled
                    />
                </div>
            </div>
        </>
    );
};


export default FormEvaluasiRisikoRtp;
