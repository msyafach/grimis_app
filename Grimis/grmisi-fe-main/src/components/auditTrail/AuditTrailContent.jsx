import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiFilter, FiDownload, FiRefreshCw, FiEye, FiCalendar } from 'react-icons/fi';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { showToast } from '@/utils/toast';
import SelectDropdown from '@/components/shared/SelectDropdown';
import API_ENDPOINTS from '../../config/apiConfig';

// Action types for filtering
const ACTION_OPTIONS = [
    { label: "Semua Aksi", value: "" },
    { label: "Create", value: "CREATE" },
    { label: "Read", value: "READ" },
    { label: "Update", value: "UPDATE" },
    { label: "Delete", value: "DELETE" },
    { label: "Login", value: "LOGIN" },
    { label: "Logout", value: "LOGOUT" },
    { label: "Export", value: "EXPORT" },
    { label: "Approve", value: "APPROVE" },
    { label: "Reject", value: "REJECT" }
];

// Resource types for filtering
const RESOURCE_OPTIONS = [
    { label: "Semua Resource", value: "" },
    { label: "User", value: "USER" },
    { label: "Group", value: "GROUP" },
    { label: "Instansi", value: "INSTANSI" },
    { label: "Identifikasi Risiko", value: "IDENTIFIKASI_RISIKO" },
    { label: "Analisis Risiko", value: "ANALISIS_RISIKO" },
    { label: "Evaluasi Risiko", value: "EVALUASI_RISIKO" },
    { label: "RTP", value: "RTP" },
    { label: "Monitoring", value: "MONITORING" },
    { label: "Approval", value: "APPROVAL" }
];

const AuditTrailContent = ({ title = "Audit Trail" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Filters
    const [filters, setFilters] = useState({
        username: '',
        action: '',
        resource_type: '',
        date_from: '',
        date_to: '',
        endpoint: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Summary stats
    const [summary, setSummary] = useState(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');

            // Build query params
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('page_size', pageSize);

            if (filters.username) params.append('username', filters.username);
            if (filters.action) params.append('action', filters.action);
            if (filters.resource_type) params.append('resource_type', filters.resource_type);
            if (filters.date_from) params.append('date_from', new Date(filters.date_from).toISOString());
            if (filters.date_to) params.append('date_to', new Date(filters.date_to).toISOString());
            if (filters.endpoint) params.append('endpoint', filters.endpoint);

            const response = await axios.get(`${API_ENDPOINTS.getAuditLogs}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setLogs(response.data.logs);
            setTotal(response.data.total);
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            showToast("error", "Gagal memuat data audit trail");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters]);

    const fetchSummary = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_ENDPOINTS.getAuditSummary}?days=7`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(response.data);
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        fetchSummary();
    }, [fetchLogs, fetchSummary]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to first page when filter changes
    };

    const clearFilters = () => {
        setFilters({
            username: '',
            action: '',
            resource_type: '',
            date_from: '',
            date_to: '',
            endpoint: ''
        });
        setPage(1);
    };

    const exportToCSV = () => {
        // Prepare CSV content
        const headers = [
            'Timestamp', 'User', 'Role', 'Action', 'Resource Type', 'Resource', 'Endpoint', 'Status', 'IP Address', 'Description'
        ];

        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString('id-ID'),
            log.username || 'System',
            log.user_role || '-',
            log.action,
            log.resource_type,
            log.resource_name || log.resource_id || '-',
            log.endpoint,
            log.status_code || '-',
            log.ip_address || '-',
            log.description
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showToast("success", "Data berhasil diekspor");
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionBadgeClass = (action) => {
        const classes = {
            'CREATE': 'bg-success',
            'READ': 'bg-info',
            'UPDATE': 'bg-warning',
            'DELETE': 'bg-danger',
            'LOGIN': 'bg-primary',
            'LOGOUT': 'bg-secondary',
            'EXPORT': 'bg-dark',
            'APPROVE': 'bg-success',
            'REJECT': 'bg-danger'
        };
        return classes[action] || 'bg-secondary';
    };

    const getStatusBadge = (statusCode) => {
        if (!statusCode) return <span className="badge bg-secondary">-</span>;
        if (statusCode >= 200 && statusCode < 300) {
            return <span className="badge bg-success">{statusCode}</span>;
        } else if (statusCode >= 400) {
            return <span className="badge bg-danger">{statusCode}</span>;
        }
        return <span className="badge bg-info">{statusCode}</span>;
    };

    const totalPages = Math.ceil(total / pageSize);

    if (isRemoved) return null;

    return (
        <>
            <div className="card stretch stretch-full">
                <CardHeader
                    title={title}
                    refresh={handleRefresh}
                    remove={handleDelete}
                    expanded={handleExpand}
                />
                <div className="card-body">
                    {/* Summary Cards */}
                    {summary && (
                        <div className="row mb-4">
                            <div className="col-md-3">
                                <div className="card bg-primary text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Total Aksi (7 Hari)</h5>
                                        <h3>{summary.total_actions}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-success text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Create</h5>
                                        <h3>{summary.actions_by_type.CREATE || 0}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-warning text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Update</h5>
                                        <h3>{summary.actions_by_type.UPDATE || 0}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-danger text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Delete</h5>
                                        <h3>{summary.actions_by_type.DELETE || 0}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <FiFilter className="me-2" />
                                Filter
                            </button>
                            <button
                                className="btn btn-outline-success"
                                onClick={exportToCSV}
                                disabled={logs.length === 0}
                            >
                                <FiDownload className="me-2" />
                                Export CSV
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => { fetchLogs(); fetchSummary(); }}
                            >
                                <FiRefreshCw className="me-2" />
                                Refresh
                            </button>
                        </div>
                        <div className="text-muted">
                            Showing {logs.length} of {total} records
                        </div>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="card mb-3 bg-light">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-3">
                                        <label className="form-label">Username</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Filter by username"
                                            value={filters.username}
                                            onChange={(e) => handleFilterChange('username', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Aksi</label>
                                        <SelectDropdown
                                            options={ACTION_OPTIONS}
                                            selectedOption={filters.action ? ACTION_OPTIONS.find(o => o.value === filters.action) : null}
                                            onSelectOption={(option) => handleFilterChange('action', option.value)}
                                            defaultSelect="Semua Aksi"
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Resource Type</label>
                                        <SelectDropdown
                                            options={RESOURCE_OPTIONS}
                                            selectedOption={filters.resource_type ? RESOURCE_OPTIONS.find(o => o.value === filters.resource_type) : null}
                                            onSelectOption={(option) => handleFilterChange('resource_type', option.value)}
                                            defaultSelect="Semua Resource"
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Dari Tanggal</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control form-control-sm"
                                            value={filters.date_from}
                                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Sampai Tanggal</label>
                                        <input
                                            type="datetime-local"
                                            className="form-control form-control-sm"
                                            value={filters.date_to}
                                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Endpoint</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            placeholder="Filter by endpoint"
                                            value={filters.endpoint}
                                            onChange={(e) => handleFilterChange('endpoint', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-3 d-flex align-items-end">
                                        <button className="btn btn-secondary w-100" onClick={clearFilters}>
                                            Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="table-responsive">
                        <table className="table table-hover table-striped">
                            <thead className="table-light">
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Resource</th>
                                    <th>Status</th>
                                    <th>Description</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">
                                            Tidak ada data audit trail
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id}>
                                            <td>{formatDate(log.timestamp)}</td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-semibold">{log.username || 'System'}</span>
                                                    <small className="text-muted">{log.user_role}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionBadgeClass(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-medium">{log.resource_type}</span>
                                                    {log.resource_name && (
                                                        <small className="text-muted">{log.resource_name}</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{getStatusBadge(log.status_code)}</td>
                                            <td>
                                                <small>{log.description}</small>
                                                {log.endpoint && (
                                                    <div className="mt-1">
                                                        <code className="bg-light px-1 rounded">{log.method} {log.endpoint}</code>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <small className="text-muted">{log.ip_address || '-'}</small>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="text-muted">
                                Page {page} of {totalPages}
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-secondary"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn btn-outline-secondary"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AuditTrailContent;
