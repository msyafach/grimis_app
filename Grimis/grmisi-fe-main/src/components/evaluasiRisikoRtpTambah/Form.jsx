import PropTypes from 'prop-types';
import { FiEdit, FiRefreshCw } from 'react-icons/fi';
import SelectDropdown from '@/components/shared/SelectDropdown';

const FormEvaluasiRisikoRtp = ({
    evaluasiRisiko,
    selectedEvaluasiRisiko,
    evaluasiRisikoRtp,
    selectedJenisPenyebab,
    formDataRtp,
    formDataEvaluasi,
    handleInput,
    handleInputEvaluasi,
    handleSelectChange,
    isByAI,
    setIsByAI,
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
                <div className="col-12 bg-light rounded-4 p-3 my-3">
                    <h5 className="mb-0">Evaluasi Risiko</h5>
                </div>

                <div className="mb-4">
                    <label className="form-label">Evaluasi Risiko<span className="text-danger">*</span></label>
                    <SelectDropdown
                        className="rounded-4 bg-light"
                        options={evaluasiRisiko.map((item) => ({
                            label: item.deskripsi,
                            value: item.id,
                        }))}
                        selectedOption={selectedEvaluasiRisiko}
                        onSelectOption={handleSelectChange}
                        defaultSelect=""
                    />
                </div>

                {selectedEvaluasiRisiko && selectedEvaluasiRisiko.value && selectedJenisPenyebab?.label && (
                    <>
                        <div>
                            <div className="col-6">
                                <div className="mb-4">
                                    <label className="form-label">Jenis <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        name="jenis_penyebab"
                                        placeholder="Jenis Penyebab"
                                        value={selectedJenisPenyebab?.label}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="mb-4">
                                    <label className="form-label">Akar Penyebab <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        name="akar_penyebab"
                                        placeholder="Akar Penyebab"
                                        value={formDataEvaluasi.deskripsi}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="col-12">
                                <div className="mb-4">
                                    <label className="form-label">Pengandalian <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        name="pengendalian"
                                        placeholder="Pengandalian"
                                        value={formDataEvaluasi.pengendalian}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="mb-4">
                                    <label className="form-label">Jenis Pengendalian <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        name="jenis_pengendalian"
                                        placeholder="Jenis Pengendalian"
                                        value={formDataEvaluasi.jenis_pengendalian}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="mb-4">
                                    <label className="form-label">RTP Count <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm rounded-4 bg-light"
                                        name="rtp_count"
                                        placeholder="RTP Count"
                                        value={formDataEvaluasi.rtp_count || 0}
                                        disabled
                                    />
                                </div>
                            </div>
                        </div>

                        {/* === Section: Risk Treatment Plan (RTP) === */}
                        <div className="col-12 bg-light rounded-4 p-3 my-3">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h5 className="mb-0">Risk Treatment Plan (RTP)</h5>
                                <div className="d-flex gap-2">
                                    <button
                                        className={`btn ${!isByAI ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        type="button"
                                        onClick={() => setIsByAI(false)}
                                    >
                                        <FiEdit size={16} className="me-2" />
                                        Input Manual
                                    </button>
                                    <button
                                        className={`btn ${isByAI ? 'btn-success' : 'btn-outline-success'}`}
                                        type="button"
                                        onClick={() => setIsByAI(true)}
                                    >
                                        <FiRefreshCw size={16} className="me-2" />
                                        Generate RTP by AI
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!isByAI ? (
                            <>
                                <div className="col-12">
                                    <div className="mb-4">
                                        <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="deskripsi"
                                            placeholder="Deskripsi"
                                            value={formDataRtp.deskripsi}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Respon Risiko <span className="text-danger">*</span></label>
                                        {/*
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="respon_risiko"
                                            placeholder="Respon Risiko"
                                            value={formDataRtp.respon_risiko}
                                            onChange={handleInput}
                                            required
                                        />
                                        */}
                                        <SelectDropdown
                                            className="rounded-4"
                                            options={[
                                                { label: 'Reduce Impact', value: 'REDUCE_IMPACT' },
                                                { label: 'Reduce Frequency', value: 'REDUCE_FREQUENCY' }
                                            ]}
                                            selectedOption={
                                                formDataRtp.respon_risiko
                                                    ? {
                                                        label:
                                                            formDataRtp.respon_risiko === 'REDUCE_IMPACT'
                                                                ? 'Reduce Impact'
                                                                : 'Reduce Frequency',
                                                        value: formDataRtp.respon_risiko,
                                                    }
                                                    : null
                                            }
                                            onSelectOption={(selected) =>
                                                handleInput({
                                                    target: {
                                                        name: 'respon_risiko',
                                                        value: selected?.value || '',
                                                    },
                                                })
                                            }
                                            isClearable
                                        />
                                    </div>
                                </div>
                                <div className="col-12">
                                    <div className="mb-4">
                                        <label className="form-label">Rencana Aksi <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="rencana_aksi"
                                            placeholder="Rencana Aksi"
                                            value={formDataRtp.rencana_aksi}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Penanggung Jawab <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="pic"
                                            placeholder="Penanggung Jawab"
                                            value={formDataRtp.pic}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Indikator <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="indikator"
                                            placeholder="Indikator"
                                            value={formDataRtp.indikator}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Output <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4"
                                            name="output"
                                            placeholder="Output"
                                            value={formDataRtp.output}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Anggaran <span className="text-danger">*</span></label>
                                        <input
                                            type="number"
                                            className="form-control form-control-sm rounded-4"
                                            name="anggaran"
                                            placeholder="Anggaran"
                                            value={formDataRtp.anggaran}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Target Waktu <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm rounded-4"
                                            name="target_waktu"
                                            placeholder="Target Waktu"
                                            value={formDataRtp.target_waktu}
                                            onChange={handleInput}
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="col-12">
                                    <div className="mb-4">
                                        <label className="form-label">Deskripsi <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-4 bg-light"
                                            name="deskripsi"
                                            placeholder="Deskripsi"
                                            value={formDataRtp.deskripsi}
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
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-4">
                                        <label className="form-label">Target Waktu <span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm rounded-4 bg-light"
                                            name="target_waktu"
                                            placeholder="Target Waktu"
                                            value={formDataRtp.target_waktu}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div >
        </>
    );
};


export default FormEvaluasiRisikoRtp;
