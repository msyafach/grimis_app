import React from 'react';
import { Button } from 'react-bootstrap';
import { FiEye, FiEdit, FiTrash2 } from 'react-icons/fi';

const TableActionButtons = ({ 
  onView, 
  onEdit, 
  onDelete, 
  hideView = false,
  hideEdit = false, 
  hideDelete = false,
  viewDisabled = false,
  editDisabled = false,
  deleteDisabled = false
}) => {
  return (
    <div className="d-flex gap-1">
      {!hideView && (
        <Button 
          variant="outline-info" 
          size="sm" 
          onClick={onView}
          disabled={viewDisabled}
          title="Lihat Detail"
        >
          <FiEye size={14} />
        </Button>
      )}
      
      {!hideEdit && (
        <Button 
          variant="outline-primary" 
          size="sm" 
          onClick={onEdit}
          disabled={editDisabled}
          title="Edit"
        >
          <FiEdit size={14} />
        </Button>
      )}
      
      {!hideDelete && (
        <Button 
          variant="outline-danger" 
          size="sm" 
          onClick={onDelete}
          disabled={deleteDisabled}
          title="Hapus"
        >
          <FiTrash2 size={14} />
        </Button>
      )}
    </div>
  );
};

export default TableActionButtons; 