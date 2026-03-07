import React, { useState, useEffect } from 'react';

const FormAkarPenyebab = ({ selectedRootCause }) => {
    const [formData, setFormData] = useState({
        jenis: '',
        deskripsi: '',
        pengendalian: '',
        jenis_pengendalian: '',
    });

    useEffect(() => {
        if (selectedRootCause) {
            setFormData({
                jenis: selectedRootCause.jenis || '',
                deskripsi: selectedRootCause.deskripsi || '',
                pengendalian: selectedRootCause.pengendalian || '',
                jenis_pengendalian: selectedRootCause.jenis_pengendalian || '',
            });
        }
    }, [selectedRootCause]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    return (
        <div>

            <div className="col-lg-12">
                <div className="mb-4">
                    <label className="form-label">Akar Penyebab <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control"
                        name="deskripsi"
                        value={formData.deskripsi}
                        onChange={handleChange}
                        readOnly
                    />
                </div>
            </div>

            <div className="col-lg-12">
                <div className="mb-4">
                    <label className="form-label">Pengendalian <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className="form-control"
                        name="pengendalian"
                        value={formData.pengendalian}
                        onChange={handleChange}
                        readOnly
                    />
                </div>
            </div>

        </div>
    );
};

export default FormAkarPenyebab;
