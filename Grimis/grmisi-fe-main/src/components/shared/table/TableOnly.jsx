import React, { useState } from 'react'
import TableSearch from './TableSearch'
import TablePagination from './TablePagination'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa'
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'

import useCardTitleActions from '@/hooks/useCardTitleActions'
import CardHeader from '@/components/shared/CardHeader';

const TableOnly = ({ data, columns }) => {
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

    console.log(data)
    console.log(columns)

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
        <div className="table-responsive">
            <div className='dataTables_wrapper dt-bootstrap5 no-footer'>
                <TableSearch table={table} setGlobalFilter={setGlobalFilter} globalFilter={globalFilter} />

                <div className="row dt-row">
                    <div className="col-sm-12 px-0">
                        <table className="table table-hover dataTable no-footer" id='projectList'>
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
                                {
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id} className='single-item chat-single-item'>
                                            {row.getVisibleCells().map((cell) => {
                                                return (
                                                    <td key={cell.id} className={cell.column.columnDef.meta?.className}>
                                                        {
                                                            flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        }
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                <TablePagination table={table} />
            </div>
        </div>
    )
}

export default TableOnly

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