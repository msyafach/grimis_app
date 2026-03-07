import React, { useState } from 'react';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import CardHeader from '@/components/shared/CardHeader';
import TablePagination from './TablePagination';
import TableSearch from './TableSearch';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';

const TableRegistrasiRisiko = ({ title, data, columns }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();

    // const [data] = useState([...fackData])
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

    if (isRemoved) return null;


    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
            pagination,
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    });


    const renderBadge = (value, isControlCount = false) => {
        if (value === null || value === '' || value === undefined) return <span>-</span>;
        
        // Check if value is a string containing a fraction format (realized/total)
        if (typeof value === 'string' && value.includes('/')) {
            const [realized, total] = value.split('/').map(Number);
            const badgeClass = realized > 0 
                ? (realized === Number(total) ? 'bg-light-success text-success' : 'bg-light-warning text-warning')
                : 'bg-light-danger text-danger';
            
            return (
                <span className={`badge ${badgeClass} rounded-pill px-3 py-2 fw-bold`}>
                    {value}
                </span>
            );
        }
        
        // Handle numeric values (legacy format)
        const num = Number(value);

        let badgeClass = '';

        if (isControlCount) {
            badgeClass = num > 0
                ? 'bg-light-success text-success'
                : 'bg-light-danger text-danger';
        } else {
            if (num >= 1 && num <= 15) badgeClass = 'bg-light-success text-success';
            else if (num >= 16 && num <= 20) badgeClass = 'bg-light-warning text-warning';
            else if (num >= 21 && num <= 25) badgeClass = 'bg-light-danger text-danger';
            else badgeClass = 'bg-light-secondary text-secondary';
        }

        return (
            <span className={`badge ${badgeClass} rounded-pill px-3 py-2 fw-bold`}>
                {num}
            </span>
        );
    };



    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <FaSort />;
        return sortConfig.direction === 'asc' ? <FaSortDown /> : <FaSortUp />;
    };

    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;

        const sorted = [...data].sort((a, b) => {
            const valA = a[sortConfig.key] ?? '';
            const valB = b[sortConfig.key] ?? '';

            if (!isNaN(valA) && !isNaN(valB)) {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            } else {
                return sortConfig.direction === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            }
        });

        return sorted;
    }, [data, sortConfig]);

    return (
        <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? "card-expand" : ""} ${refreshKey ? "card-loading" : ""}`}>
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                            <TableSearch table={table} setGlobalFilter={setGlobalFilter} globalFilter={globalFilter} />
                            <table className="table table-hover dataTable no-footer" id='projectList'>
                                <thead>
                                    <tr>
                                        <th rowSpan="2">Tindakan</th>
                                        <th rowSpan="2" onClick={() => requestSort('pernyataan_risiko')} style={{ cursor: 'pointer', width: '70%' }} className="text-wrap">
                                            Pernyataan Risiko {getSortIcon('pernyataan_risiko')}
                                        </th>
                                        <th colSpan="4" className="text-center">Level</th>
                                        <th colSpan="2" className="text-center">Pengendalian</th>
                                    </tr>
                                    <tr>
                                        {['level_risiko_inherit', 'level_risiko_residual', 'level_risiko_treated', 'level_risiko_actual'].map((col) => {
                                            const labels = {
                                                level_risiko_inherit: 'Inherent Risk',
                                                level_risiko_residual: 'Residual Risk',
                                                level_risiko_treated: 'Treated Risk',
                                                level_risiko_actual: 'Actual Risk'
                                            };
                                            return (
                                                <th key={col} onClick={() => requestSort(col)} style={{ cursor: 'pointer', width: '5%' }} className="text-wrap text-center">
                                                    {labels[col]} {getSortIcon(col)}
                                                </th>
                                            );
                                        })}

                                        {['attachment_count', 'rtp_count'].map((col) => {
                                            const labels = {
                                                attachment_count: 'Existing Control',
                                                rtp_count: 'Risk Treatment Plan (RTP)'
                                            };
                                            return (
                                                <th key={col} onClick={() => requestSort(col)} style={{ cursor: 'pointer', width: '5%' }} className="text-wrap text-center">
                                                    {labels[col]} {getSortIcon(col)}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedData.map((row, index) => (
                                        <tr key={index}>
                                            <td className="text-center">{columns[0].cell({ row: { original: row } })}</td>
                                            <td className="text-wrap">{row.pernyataan_risiko}</td>
                                            <td className="text-center">{renderBadge(row.level_risiko_inherit)}</td>
                                            <td className="text-center">{renderBadge(row.level_risiko_residual)}</td>
                                            <td className="text-center">{renderBadge(row.level_risiko_treated)}</td>
                                            <td className="text-center">{renderBadge(row.level_risiko_actual)}</td>
                                            <td className="text-center">{renderBadge(row.attachment_count, true)}</td>
                                            <td className="text-center">{renderBadge(row.rtp_count, true)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <TablePagination table={table} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableRegistrasiRisiko;