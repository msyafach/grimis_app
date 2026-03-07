import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { FaSync, FaEye, FaSort, FaSortDown, FaSortUp, FaEdit } from 'react-icons/fa';
import { FiMoreVertical, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';                                  
import API_ENDPOINTS from '@/config/apiConfig';
import { useInstansi } from '@/context/InstansiContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import { useTahun } from '@/context/TahunContext';
import { showToast } from '@/utils/toast';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { useAuth } from '@/context/AuthContext';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import Dropdown from '@/components/shared/Dropdown';
import { 
  flexRender, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getPaginationRowModel, 
  getSortedRowModel, 
  useReactTable 
} from '@tanstack/react-table';

const MonitoringRisiko = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { idInstansi } = useInstansi();
  const { idIndukUnitKerja } = useIndukUnitKerja();
  const { tahunId } = useTahun();
  
  // Table state
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    if (tahunId) {
      fetchMonitoringRisiko();
    } else {
      setLoading(false);
    }
  }, [idInstansi, idIndukUnitKerja, tahunId]);

  const fetchMonitoringRisiko = async () => {
    if (!tahunId) {
      setMonitoringData([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('access_token');
      
      const url = API_ENDPOINTS.getMonitoringRisiko(tahunId);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setMonitoringData(response.data);
      }
    } catch (error) {
      console.error('Error fetching monitoring risiko:', error);
      const errorMessage = error.response?.data?.detail || 'Gagal memuat data monitoring risiko';
      setError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = (id) => {
    navigate(`/pengelolaan-risiko/monitoring-risiko/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/pengelolaan-risiko/monitoring-risiko/edit/${id}`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge bg="warning">Menunggu Review</Badge>;
      case 'VERIFIED':
        return <Badge bg="success">Terverifikasi</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Ditolak</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Format skor dampak to show only the name without the score value
  const formatSkorDampak = (skorDampakText) => {
    if (!skorDampakText) return '-';
    // Extract just the name part (before the parenthesis)
    const match = skorDampakText.match(/^([^(]+)/);
    return match ? match[1].trim() : skorDampakText;
  };

  // Define columns for the Table component
  const columns = useMemo(() => [
    {
      header: 'Tindakan',
      accessorKey: 'actions',
      cell: ({ row }) => {
        const item = row.original;
        const dropdownItems = [
          {
            label: 'Lihat',
            icon: <FaEye />,
            onClick: () => handleViewDetail(item.id)
          }
        ];
        
        // Only show Edit option for SUPER_ADMIN and PENGELOLA_RISIKO
        if (user && (user.role === 'SUPER_ADMIN' || user.role === 'PENGELOLA_RISIKO')) {
          dropdownItems.push({
            label: 'Edit',
            icon: <FaEdit />,
            onClick: () => handleEdit(item.id)
          });
        }
        
        return (
          <Dropdown
            triggerIcon={<FiMoreVertical />}
            dropdownItems={dropdownItems}
            dropdownPosition="dropdown-menu-end"
            isItemIcon={true}
            iconStrokeWidth={1.7}
            dropdownParentStyle="text-end"
            onClick={(label, id) => {
              if (label === "Lihat") {
                handleViewDetail(item.id);
              } else if (label === "Edit") {
                handleEdit(item.id);
              }
            }}
          />
        );
      },
      meta: {
        className: 'text-center',
        headerClassName: 'text-center'
      }
    },
    {
      header: 'Nama Kejadian',
      accessorKey: 'nama_kejadian'
    },
    {
      header: 'Nama Penyebab',
      accessorKey: 'nama_penyebab',
      cell: ({ getValue }) => getValue() || '-'
    },
    {
      header: 'Tempat Kejadian',
      accessorKey: 'tempat_kejadian'
    },
    {
      header: 'Waktu Kejadian',
      accessorKey: 'waktu_kejadian',
      cell: ({ getValue }) => formatDate(getValue())
    },
    {
      header: 'Triwulan',
      accessorKey: 'triwulan_periode_kejadian_nama'
    },
    {
      header: 'Pernyataan Risiko',
      accessorKey: 'nama'
    },
    {
      header: 'Skor Dampak',
      accessorKey: 'skor_dampak_text',
      cell: ({ getValue }) => formatSkorDampak(getValue())
    },
  ], []);

  // Initialize the table
  const table = useReactTable({
    data: monitoringData,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Arrow toggle component for sorting
  const ArrowToggle = ({ header, children }) => {
    const position = header.column.getIsSorted();
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
    );
  };

  return (
    <>
      <PageHeader>
        <div className="page-title">
        </div>
        {user && (user.role === 'SUPER_ADMIN' || user.role === 'PENGELOLA_RISIKO') && (
          <div className="d-flex align-items-center gap-2 page-header-right-items-wrapper">
            <Button 
              variant="primary" 
              onClick={() => navigate('/pengelolaan-risiko/monitoring-risiko/tambah')}
            >
              <FiPlus size={16} className='me-2' />
              <span>Tambah Monitoring Risiko</span>
            </Button>
          </div>
        )}
      </PageHeader>
      <div className='main-content ' style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className='row'>
          <div className="col-12">
            <ContentLoaderWrapper loading={loading} error={error}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center py-2">
                  <h5 className="mb-0">Data Monitoring Risiko </h5>
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="d-flex align-items-center gap-2"
                    onClick={fetchMonitoringRisiko}
                    disabled={!tahunId || loading}
                  >
                    <FaSync size={14} className={loading ? "fa-spin" : ""} />
                    <span>Refresh Data</span>
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  {!tahunId ? (
                    <div className="alert alert-warning m-3">
                      Silakan pilih tahun terlebih dahulu untuk melihat data monitoring risiko.
                    </div>
                  ) : monitoringData.length === 0 ? (
                    <div className="text-center py-5">
                      <p className="mb-0">Belum ada data monitoring risiko untuk tahun {tahunId}</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <div className="dataTables_wrapper dt-bootstrap5 no-footer">
                        {/* Table Search */}
                        <div className='row gy-2'>
                          <div className='col-sm-12 col-md-6 ps-3 m-0 pb-10'>
                            <div className='dataTables_length d-flex justify-content-md-start justify-content-center'>
                              <label className='d-flex align-items-center gap-1'>
                                Show
                                <select
                                  className='form-select form-select-sm w-auto pe-4'
                                  value={table.getState().pagination.pageSize}
                                  onChange={e => {
                                    table.setPageSize(Number(e.target.value));
                                  }}
                                >
                                  {[10, 20, 30, 40, 50].map(pageSize => (
                                    <option key={pageSize} value={pageSize}>
                                      {pageSize}
                                    </option>
                                  ))}
                                </select>
                                entries
                              </label>
                            </div>
                          </div>
                          <div className='col-sm-12 col-md-6 pe-3 m-0 pb-10'>
                            <div className='dataTables_filter d-flex justify-content-md-end justify-content-center'>
                              <label className='d-inline-flex align-items-center gap-2'>
                                Search:
                                <input
                                  type="text"
                                  value={globalFilter ?? ""}
                                  onChange={(e) => setGlobalFilter(e.target.value)}
                                  placeholder='Search...'
                                  className="form-control form-control-sm"
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="row dt-row">
                          <div className="col-sm-12 px-0">
                            <table className="table table-hover dataTable no-footer">
                              <thead>
                                {table.getHeaderGroups().map((headerGroup) => (
                                  <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                      <th
                                        key={header.id}
                                        className={`${header.column.columnDef.meta?.headerClassName || ''} text-wrap`}
                                      >
                                        <ArrowToggle header={header}>
                                          {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                          )}
                                        </ArrowToggle>
                                      </th>
                                    ))}
                                  </tr>
                                ))}
                              </thead>
                              <tbody>
                                {table.getRowModel().rows.map((row) => (
                                  <tr key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                      <td
                                        key={cell.id}
                                        className={`${cell.column.columnDef.meta?.className || ''} text-wrap`}
                                      >
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext()
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Pagination */}
                        <div className="row gy-2">
                          <div className="col-sm-12 col-md-5 ps-3">
                            <div className="dataTables_info" role="status" aria-live="polite">
                              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, monitoringData.length)} of {monitoringData.length} entries
                            </div>
                          </div>
                          <div className="col-sm-12 col-md-7 pe-3">
                            <div className="dataTables_paginate paging_simple_numbers">
                              <ul className="pagination mb-0 justify-content-md-end justify-content-center">
                                <li
                                  className={`paginate_button page-item previous ${!table.getCanPreviousPage() ? "disabled" : ""}`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                  >
                                    Previous
                                  </button>
                                </li>
                                {Array.from({ length: table.getPageCount() }, (_, i) => (
                                  <li
                                    key={i}
                                    className={`paginate_button page-item ${i === table.getState().pagination.pageIndex ? "active" : ""}`}
                                  >
                                    <button
                                      className="page-link"
                                      onClick={() => table.setPageIndex(i)}
                                    >
                                      {i + 1}
                                    </button>
                                  </li>
                                ))}
                                <li
                                  className={`paginate_button page-item next ${!table.getCanNextPage() ? "disabled" : ""}`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                  >
                                    Next
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </ContentLoaderWrapper>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MonitoringRisiko; 