import { FiMoreHorizontal } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import actions from './Actions';
import { Badge } from 'react-bootstrap';

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

export const getColumns = (handleActionClick, user) => {
  const canDelete = user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_KLP');
  
  return [
    {
      accessorKey: 'tindakan',
      header: () => 'Tindakan',
      cell: (info) => {
        const row = info.row.original;
        const handleClick = (key) => () => handleActionClick(key, row);

        return (
          <div className="d-flex justify-content-center gap-2">
            <Dropdown
              dropdownItems={actions
                .filter(item => item.key !== 'delete' || canDelete)
                .map((item) => ({
                  ...item,
                  onClick: handleClick(item.key)
                }))
              }
              triggerIcon={<FiMoreHorizontal />}
              triggerClass="avatar-md"
              triggerPosition="0,21"
            />
          </div>
        );
      },
      meta: {
        headerClassName: 'text-center',
        className: 'text-center',
      },
    },
    {
      accessorKey: 'nama_kejadian',
      header: () => 'Nama Kejadian',
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: 'tempat_kejadian',
      header: () => 'Tempat Kejadian',
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: 'waktu_kejadian',
      header: () => 'Waktu Kejadian',
      cell: (info) => <span>{formatDate(info.getValue())}</span>,
    },
    {
      accessorKey: 'triwulan_periode_kejadian_nama',
      header: () => 'Triwulan',
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: 'nama',
      header: () => 'Pernyataan Risiko',
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: 'skor_dampak_text',
      header: () => 'Skor Dampak',
      cell: (info) => <span>{info.getValue()}</span>,
    },
    {
      accessorKey: 'status',
      header: () => 'Status',
      cell: (info) => getStatusBadge(info.getValue()),
    },
  ];
}; 