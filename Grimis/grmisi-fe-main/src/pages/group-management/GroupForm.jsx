import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';

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
            if (group) {
                // Edit mode
                await axios.put(`${API_ENDPOINTS.groups}/${group.id}`, formData);
            } else {
                // Create mode
                await axios.post(API_ENDPOINTS.groups, formData);
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
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ marginBottom: '8px' }}>{group ? 'Edit Group' : 'Tambah Group Baru'}</h2>
                <p style={{ color: '#666' }}>
                    {group ? 'Perbarui informasi group' : 'Buat group baru untuk mengelola akses pengguna'}
                </p>
            </div>

            {error && (
                <div
                    style={{
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#900',
                    }}
                >
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                <label
                    htmlFor="name"
                    style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}
                >
                    Nama Group <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    minLength={1}
                    maxLength={100}
                    placeholder="Contoh: Admin KLP"
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />
                <small style={{ color: '#666' }}>Nama group harus unik (maksimal 100 karakter)</small>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <label
                    htmlFor="description"
                    style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}
                >
                    Deskripsi
                </label>
                <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    maxLength={500}
                    placeholder="Deskripsi singkat tentang tujuan group ini..."
                    style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                    }}
                />
                <small style={{ color: '#666' }}>Opsional (maksimal 500 karakter)</small>
            </div>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid #eee',
                }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    Batal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: loading ? '#ccc' : '#0066cc',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                    }}
                >
                    {loading ? 'Menyimpan...' : group ? 'Perbarui' : 'Simpan'}
                </button>
            </div>
        </form>
    );
};

export default GroupForm;