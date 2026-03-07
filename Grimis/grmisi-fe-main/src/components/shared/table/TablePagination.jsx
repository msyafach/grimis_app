import React from 'react';

const TablePagination = ({ table }) => {
    const { pageIndex, pageSize } = table.getState().pagination;
    const totalEntries = table.getRowCount();

    const firstEntry = totalEntries === 0 ? 0 : pageIndex * pageSize + 1;
    const lastEntry = totalEntries === 0 ? 0 : Math.min((pageIndex + 1) * pageSize, totalEntries);

    const paginationInfo = `Showing ${firstEntry} to ${lastEntry} of ${totalEntries} entries`;

    return (
        <div className="row gy-2">
            <div className="col-sm-12 col-md-5 p-0">
                <div className="dataTables_info text-lg-start text-center" id="proposalList_info" role="status" aria-live="polite">
                    {paginationInfo}
                </div>
            </div>
            <div className="col-sm-12 col-md-7 p-0">
                <div className="dataTables_paginate paging_simple_numbers" id="proposalList_paginate">
                    <ul className="pagination mb-0 justify-content-md-end justify-content-center">
                        <li
                            className={`paginate_button page-item previous ${!table.getCanPreviousPage() ? "disabled" : ""}`}
                            onClick={() => {
                                // Hanya panggil previousPage jika memang bisa kembali
                                if (table.getCanPreviousPage()) {
                                    table.previousPage();
                                }
                            }}
                        >
                            <a href="#" onClick={(e) => e.preventDefault()} className="page-link">Previous</a>
                        </li>

                        <li className="paginate_button page-item active">
                            <a href="#" onClick={(e) => e.preventDefault()} aria-controls="proposalList" data-dt-idx="0" tabIndex="0" className="page-link">
                                {pageIndex + 1}
                            </a>
                        </li>

                        <li
                            className={`paginate_button page-item next ${!table.getCanNextPage() ? "disabled" : ""}`}
                            onClick={() => {
                                // Hanya panggil nextPage jika memang bisa maju
                                if (table.getCanNextPage()) {
                                    table.nextPage();
                                }
                            }}
                        >
                            <a href="#" onClick={(e) => e.preventDefault()} className="page-link">Next</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TablePagination;