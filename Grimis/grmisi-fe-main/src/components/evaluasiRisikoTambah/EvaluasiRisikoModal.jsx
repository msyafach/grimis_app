import React, { useState } from 'react'
import { FiX } from 'react-icons/fi'
import 'react-quill/dist/quill.snow.css';
import EvaluasiRisikoTabel from './EvaluasiRisikoTabel';
import FormAkarPenyebab from './FormAkarPenyebab';

const EvaluasiRisikoModal = ({ generatedRootCauses, loadingGenerate, selectedRootCause, setSelectedRootCause }) => {

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
                                    setSelectedRootCause={setSelectedRootCause}
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
                            disabled={!selectedRootCause}
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EvaluasiRisikoModal