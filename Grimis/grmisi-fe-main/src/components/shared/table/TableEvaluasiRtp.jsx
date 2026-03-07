import React, { useState } from 'react'
import TableSearch from './TableSearch'
import TablePagination from './TablePagination'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa'
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'

import useCardTitleActions from '@/hooks/useCardTitleActions'
import CardHeader from '@/components/shared/CardHeader';

const TableEvaluasiRtp = ({ title, data, columns }) => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();

    if (isRemoved) {
        return null;
    }

    // const [data] = useState([...fackData])
    const [sorting, setSorting] = useState([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    })

    const filterGlobal = (rows) => {
        return rows.filter(row => {
            return row.values.some((value) => {
                // Convert value to string and split the globalFilter by space to check each word
                const cellValue = value.toString().toLowerCase();
                const searchTerms = globalFilter.toLowerCase().split(" "); // Split the search term by space
                // Check if each search term exists in the cell value
                return searchTerms.every(term => cellValue.includes(term));
            });
        });
    };

    const table = useReactTable({
        data,
        columns,
        state: {
            globalFilter,
            pagination
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
        filterRows: filterGlobal,
    })



    return (
        <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? "card-expand" : ""} ${refreshKey ? "card-loading" : ""}`}>
                <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                <div className="card-body p-0">
                    <div
                        className="table-responsive"
                        style={{ overflowX: 'auto' }}
                    >
                        <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                            <TableSearch table={table} setGlobalFilter={setGlobalFilter} globalFilter={globalFilter} />

                            <div className="row dt-row">
                                <div className="col-sm-12 px-0">
                                    <table
                                        className="table table-hover dataTable no-footer"
                                        id='projectList'
                                        style={{ tableLayout: 'auto', wordWrap: 'break-word', whiteSpace: 'normal' }}
                                    >
                                        <thead>
                                            {table.getHeaderGroups().map((headerGroup) => (
                                                <tr key={headerGroup.id} >
                                                    {
                                                        headerGroup.headers.map((header) => {
                                                            return (
                                                                <th key={header.id} className={header.column.columnDef.meta?.headerClassName}>
                                                                    {
                                                                        header.id === "id" ?
                                                                            <div className='d-flex gap-2'>
                                                                                {
                                                                                    flexRender(
                                                                                        header.column.columnDef.header,
                                                                                        header.getContext()
                                                                                    )

                                                                                }
                                                                                <ArrowToggle header={header} />
                                                                            </div>
                                                                            :
                                                                            <ArrowToggle header={header}>
                                                                                {
                                                                                    flexRender(
                                                                                        header.column.columnDef.header,
                                                                                        header.getContext()
                                                                                    )
                                                                                }
                                                                            </ArrowToggle>
                                                                    }
                                                                </th>
                                                            )
                                                        })
                                                    }
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {table.getRowModel().rows.map((row) => (
                                                <tr key={row.id} >
                                                    {row.getVisibleCells().map((cell) => {
                                                        // Cell yg memiliki rowSpan sudah render sendiri <td>, maka langsung render
                                                        if (cell.column.id === 'deskripsi_evaluasi') {
                                                            return flexRender(cell.column.columnDef.cell, cell.getContext());
                                                        }

                                                        // Kolom biasa:
                                                        return (
                                                            <td key={cell.id} style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>

                                    </table>
                                </div>
                            </div>

                            <TablePagination table={table} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TableEvaluasiRtp

const ArrowToggle = ({ header, children }) => {
    const position = header.column.getIsSorted()
    return (
        <div
            className='table-head'
            style={{
                cursor: header.column.getCanSort() ? "pointer" : "default"
            }}
            onClick={header.column.getToggleSortingHandler()}
        >

            {children}
            {
                {
                    asc: <FaSortUp size={13} opacity={position === "asc" ? 1 : .125} />,
                    desc: <FaSortDown size={13} opacity={position === "desc" ? 1 : .125} />
                }[position]
            }
            {header.column.getCanSort() && !position ? (
                <FaSort size={13} opacity={.125} />
            ) : null}
        </div>
    )
}