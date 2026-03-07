import { useEffect, useState } from "react";
import { FiPlus, FiTrash, FiExternalLink, FiSave, FiEdit3 } from "react-icons/fi";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useInstansi } from '../../context/InstansiContext';
import SelectDropdownCustom from '../shared/SelectDropdownCustom';
import API_ENDPOINTS from '../../config/apiConfig';

const token = localStorage.getItem('access_token');

const FormEvaluasiRisiko = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const analisisId = state?.analisisId;
    const { idInstansi } = useInstansi();
    const { identifikasiId } = useParams();
    const [data, setData] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [form, setForm] = useState({});
    const [isAdding, setIsAdding] = useState(false);
    const [newForm, setNewForm] = useState({
        deskripsi: '',
        jenis_penyebab_id: '',
    });
    const [dataJenisPenyebab, setDataJenisPenyebab] = useState([]);

    const fetchData = async () => {
        try {
            const evaluasiRisikoRespon = await axios.get(API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiAnalisis(identifikasiId, analisisId), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setData(evaluasiRisikoRespon.data || []);
        } catch (err) {
            console.error("Gagal mengambil data:", err);
        }
    };
    const fetchJenisPenyebab = async () => {
        try {
            const res = await axios.get(API_ENDPOINTS.getJenisPenyebabAll(idInstansi), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setDataJenisPenyebab(res.data || []);
        } catch (err) {
            console.error("Gagal mengambil jenis penyebab:", err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchJenisPenyebab();
    }, []);

    const handleEdit = (index) => {
        setEditIndex(index);
        const item = data[index];
        setForm({
            deskripsi: item.deskripsi || "",
            jenis_penyebab_id: String(item.jenis_penyebab_id || ""),
        });
    };

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelect = (option) => {
        setNewForm((prev) => ({ ...prev, jenis_penyebab_id: option.value }));
    };

    const handleSave = async (id, index) => {
        const original = data[index];
        const payload = {
            deskripsi: form.deskripsi,
            jenis_penyebab_id: form.jenis_penyebab_id,
            jenis: "penyebab",
            pengendalian: original.pengendalian || "",
            jenis_pengendalian: original.jenis_pengendalian || "",
        };
        try {
            await axios.put(API_ENDPOINTS.updateEvaluasiRisikoById(id), payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            setEditIndex(null);
            fetchData();
        } catch (err) {
            console.error("Gagal update:", err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(API_ENDPOINTS.deleteEvaluasiRisikoById(id),
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            fetchData();
        } catch (err) {
            console.error("Gagal hapus:", err);
        }
    };

    const handleNewChange = (e) => {
        setNewForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveNew = async () => {
        const payload = {
            deskripsi: newForm.deskripsi,
            jenis_penyebab_id: newForm.jenis_penyebab_id,
            jenis: "penyebab",
            identifikasi_risiko_id: identifikasiId,
            analisis_risiko_id: analisisId,
            pengendalian: "",
            jenis_pengendalian: "",
        };
        try {
            await axios.post(`${API_ENDPOINTS.apiBaseUrl || "http://localhost:8000"}/api/v1/evaluasi-risiko`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setIsAdding(false);
            setNewForm({ deskripsi: '', jenis_penyebab_id: '' });
            fetchData();
        } catch (err) {
            console.error("Gagal menambah data:", err);
        }
    };

    const handleCancelNew = () => {
        setIsAdding(false);
        setNewForm({ deskripsi: '', jenis_penyebab_id: '' });
    };

    useEffect(() => {
        const refreshHandler = () => fetchData();
        window.addEventListener("refresh-evaluasi-risiko", refreshHandler);
        return () => window.removeEventListener("refresh-evaluasi-risiko", refreshHandler);
    }, []);

    const goToMitigasi = (id) => {
        navigate(`/kelola-mitigasi/${id}`);
    };

    return (
        <div>
            <table className="table table-hover dataTable no-footer">
                <thead>
                    <tr>
                        <th>Akar Penyebab</th>
                        <th>Jenis Penyebab</th>
                        <th>Mitigasi</th>
                        <th>Tindakan</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center text-muted">
                                Tidak ada data
                            </td>
                        </tr>
                    )}
                    {data.map((item, index) => (
                        <tr key={item.id}>
                            <td className="align-middle">
                                {editIndex === index ? (
                                    <input
                                        name="deskripsi"
                                        className="form-control form-control-sm rounded-4"
                                        value={form.deskripsi}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    item.deskripsi
                                )}
                            </td>
                            <td className="align-middle">
                                {editIndex === index ? (
                                    <SelectDropdownCustom
                                        className="rounded-3"
                                        options={dataJenisPenyebab.map((j) => ({
                                            label: j.nama,
                                            value: String(j.id),
                                        }))}
                                        selectedOption={dataJenisPenyebab
                                            .map((j) => ({
                                                label: j.nama,
                                                value: String(j.id),
                                            }))
                                            .find((opt) => opt.value === String(form.jenis_penyebab_id)) || null}
                                        defaultSelect={String(form.jenis_penyebab_id)}
                                        onSelectOption={(option) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                jenis_penyebab_id: option.value,
                                            }))
                                        }
                                    />
                                ) : (
                                    dataJenisPenyebab.find((j) => j.id === item.jenis_penyebab_id)?.nama || "-"
                                )}
                            </td>

                            <td className="align-middle">
                                <button
                                    className="btn btn-sm btn-primary"
                                    type="button"
                                    onClick={() => goToMitigasi(item.id)}
                                >
                                    <FiExternalLink className="me-1" size={16} /> Kelola Mitigasi
                                </button>
                            </td>
                            <td className="align-middle">
                                <div className="d-flex gap-2 align-items-center">
                                    {editIndex === index ? (
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleSave(item.id, index)}
                                        >
                                            <FiSave size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-sm btn-light"
                                            onClick={() => handleEdit(index)}
                                        >
                                            <FiEdit3 size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-light-danger"
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        <FiTrash size={16} />
                                    </button>
                                </div>
                            </td>

                        </tr>
                    ))}

                    {isAdding && (
                        <tr>
                            <td className="align-middle">
                                <input
                                    name="deskripsi"
                                    className="form-control form-control-sm rounded-4"
                                    value={newForm.deskripsi}
                                    onChange={handleNewChange}
                                />
                            </td>
                            <td className="align-middle">
                                <SelectDropdownCustom
                                    className="rounded-3"
                                    options={dataJenisPenyebab.map((j) => ({
                                        label: j.nama,
                                        value: String(j.id),
                                    }))}
                                    selectedOption={dataJenisPenyebab
                                        .map((j) => ({
                                            label: j.nama,
                                            value: String(j.id),
                                        }))
                                        .find((opt) => opt.value === newForm.jenis_penyebab_id) || null}
                                    defaultSelect={String(newForm.jenis_penyebab_id)}
                                    onSelectOption={handleSelect}
                                />
                            </td>
                            <td className="align-middle">
                                <button className="btn btn-sm btn-secondary" disabled>
                                    <FiExternalLink className="me-1" size={16} /> Kelola Mitigasi
                                </button>
                            </td>
                            <td className="align-middle">
                                <div className="d-flex gap-2 align-items-center">
                                    <button className="btn btn-sm btn-primary" onClick={handleSaveNew}>
                                        <FiSave size={16} />
                                    </button>
                                    <button className="btn btn-sm btn-light-danger" onClick={handleCancelNew}>
                                        <FiTrash size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="d-flex justify-content-center">
                {!isAdding && (
                    <button className="btn btn-sm btn-primary" onClick={() => setIsAdding(true)}>
                        <FiPlus className="me-1" size={16} /> Tambah Akar Penyebab
                    </button>
                )}
            </div>
        </div>
    );
};

export default FormEvaluasiRisiko;
