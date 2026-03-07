import React, { useState } from 'react';
import PropTypes from 'prop-types';
import TableSearch from './TableSearch';
import TablePagination from './TablePagination';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa';

const TableEvaluasiAkarPenyebab = ({ title, data, columns }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();

    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    if (isRemoved) return null;

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            globalFilter,
            pagination,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <>
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="table-responsive">
                <div className="dataTables_wrapper dt-bootstrap5 no-footer">
                    <TableSearch table={table} setGlobalFilter={setGlobalFilter} globalFilter={globalFilter} />

                    <div className="row dt-row">
                        <div className="col-sm-12 px-0">
                            <table className="table table-hover dataTable no-footer" id="akarPenyebabList">
                                <thead>
                                    {table.getHeaderGroups().map(headerGroup => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map(header => (
                                                <th
                                                    key={header.id}
                                                    className={`${header.column.columnDef.meta?.headerClassName || ''} text-wrap`}
                                                >
                                                    <ArrowToggle header={header}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </ArrowToggle>
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id}>
                                            {row.getVisibleCells().map(cell => (
                                                <td
                                                    key={cell.id}
                                                    className={`${cell.column.columnDef.meta?.className || ''} text-wrap`}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <TablePagination table={table} />
                </div>
            </div>
        </>
    );
};

TableEvaluasiAkarPenyebab.propTypes = {
    title: PropTypes.string.isRequired,
    data: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
};

export default TableEvaluasiAkarPenyebab;

const ArrowToggle = ({ header, children }) => {
    const position = header.column.getIsSorted();

    return (
        <div
            className="table-head"
            style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
            onClick={header.column.getToggleSortingHandler()}
        >
            {children}
            {{
                asc: <FaSortUp size={13} opacity={1} />,
                desc: <FaSortDown size={13} opacity={1} />,
            }[position] || <FaSort size={13} opacity={0.125} />}
        </div>
    );
};
