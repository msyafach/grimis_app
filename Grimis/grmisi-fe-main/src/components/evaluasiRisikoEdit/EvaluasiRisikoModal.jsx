import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import 'react-quill/dist/quill.snow.css';
import EvaluasiRisikoTabel from './EvaluasiRisikoTabel';

const EvaluasiRisikoModal = ({ generatedRootCauses, loadingGenerate, selectedRootCauses, setSelectedRootCauses, savedRootCauseIds, onSaveRootCauses }) => {

    return (
        <div className="modal fade-scale" id="evaluasiRisikoModal" tabIndex="-1" aria-labelledby="evaluasiRisikoModal" aria-hidden="true" data-bs-dismiss="ou">
            <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Evaluasi Risiko Akar Penyebab</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        {loadingGenerate ? (
                            <div className="d-flex justify-content-center align-items-center my-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading AI data...</span>
                                </div>
                                <span className="ms-2">Generating root causes...</span>
                            </div>
                        ) : (
                            <>
                                <EvaluasiRisikoTabel
                                    generatedRootCauses={generatedRootCauses}
                                    selectedRootCauses={selectedRootCauses}
                                    setSelectedRootCauses={setSelectedRootCauses}
                                    savedRootCauseIds={savedRootCauseIds}
                                />
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-light-danger" data-bs-dismiss="modal">Batal</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            data-bs-dismiss="modal"
                            disabled={!selectedRootCauses || selectedRootCauses.length === 0}
                            // onClick={() => selectedRootCauses && onSaveRootCauses(selectedRootCauses)}
                            // onClick={() => onSaveRootCauses(selectedRootCauses)}
                            onClick={() => {
                                if (selectedRootCauses.length === 0) {
                                    alert("Pilih minimal satu akar penyebab.");
                                    return;
                                }
                                // Simpan ke backend
                                onSaveRootCauses(selectedRootCauses); // ⬅️ Kirim array ke parent
                            }}
                        >
                            Simpan ({selectedRootCauses?.length || 0})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EvaluasiRisikoModal