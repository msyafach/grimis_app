import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_ENDPOINTS from '@/config/apiConfig';

const GroupForm = ({ group, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (group) {
            setFormData({
                name: group.name,
                description: group.description || '',
                permissions: group.permissions || [],
            });
        }
    }, [group]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('access_token');
            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            if (group) {
                await axios.put(`${API_ENDPOINTS.groups}/${group.id}`, formData, config);
            } else {
                await axios.post(API_ENDPOINTS.groups, formData, config);
            }
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && (
                <div
                    className="alert alert-danger"
                    style={{ marginBottom: '16px' }}
                >
                    {error}
                </div>
            )}

            <div className="form-group">
                <label htmlFor="name" className="form-label">
                    Nama Group <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={1}
                    maxLength={100}
                    placeholder="Contoh: Admin KLP"
                />
                <small className="form-text text-muted">Nama group harus unik (maksimal 100 karakter)</small>
            </div>

            <div className="form-group">
                <label htmlFor="description" className="form-label">
                    Deskripsi
                </label>
                <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    maxLength={500}
                    placeholder="Deskripsi singkat tentang tujuan group ini..."
                />
                <small className="form-text text-muted">Opsional (maksimal 500 karakter)</small>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                >
                    Batal
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >
                    {loading ? 'Menyimpan...' : (group ? 'Perbarui' : 'Simpan')}
                </button>
            </div>
        </form>
    );
};

export default GroupForm;
