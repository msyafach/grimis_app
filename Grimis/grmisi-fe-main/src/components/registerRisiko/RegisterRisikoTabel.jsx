import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TableResgitrasiRisiko from '@/components/shared/table/TableRegistrasiRisiko';
import { FiEdit3, FiEye, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import { showToast } from '@/utils/toast';
import * as XLSX from 'xlsx';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import API_ENDPOINTS from '@/config/apiConfig';

const actions = [
    { label: "Lihat Detail", icon: <FiEye /> },
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Hapus", icon: <FiTrash2 /> },
];

const RegisterRisikoTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { tahunId } = useTahun();

    const [dataStrukturOrganisasi, setDataStrukturOrganisasi] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                if (!idInstansi || !tahunId) return;
                const token = localStorage.getItem('access_token');

                // First get all identifikasi-risiko data
                const identifikasiResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoAll(idInstansi, tahunId), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const identifikasiData = identifikasiResponse.data || [];
                const combinedData = [];

                // Loop through each identifikasi item
                for (const identifikasiItem of identifikasiData) {
                    let totalRtpCount = 0; // Initialize total RTP count for this identifikasi item
                    let totalEcCount = 0;  // Initialize total EC count for this identifikasi item

                    try {
                        // Get specific analisis-risiko for this identifikasi item
                        const analisisResponse = await axios.get(
                            API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoIdTahun(identifikasiItem.id, tahunId),
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );

                        const analisisData = analisisResponse.data || [];

                        // If there are analisis, loop through each analisis and fetch related EC and evaluasi data
                        if (analisisData.length > 0) {
                            const analisisItem = analisisData[0]; // There should only be one analysis per identifikasi

                            // Get existing control (EC) data for this analisis
                            const existingControlRespon = await axios.get(
                                API_ENDPOINTS.getAnalisisRisikoAttachment(analisisItem.id),
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                }
                            );

                            const ecData = existingControlRespon.data || [];
                            totalEcCount = ecData.length; // Set the total EC count

                            // Get evaluasi-risiko data for this analisis
                            const evaluasiResponse = await axios.get(
                                API_ENDPOINTS.getEvaluasiRisikoByIdentifikasiAnalisis(identifikasiItem.id, analisisItem.id),
                                {
                                    headers: {
                                        Authorization: `Bearer ${token}`,
                                    },
                                }
                            );

                            const evaluasiData = evaluasiResponse.data || [];

                            // Calculate realized and total RTP counts
                            let totalRtpCount = "0/0";
                            if (evaluasiData.length > 0) {
                                let realized = 0;
                                let total = 0;

                                evaluasiData.forEach(item => {
                                    if (typeof item.rtp_count === 'string' && item.rtp_count.includes('/')) {
                                        // Parse the "realized/total" format
                                        const [itemRealized, itemTotal] = item.rtp_count.split('/').map(Number);
                                        realized += itemRealized;
                                        total += itemTotal;
                                    } else if (typeof item.rtp_count === 'number') {
                                        // Legacy format - just add to total
                                        total += item.rtp_count || 0;
                                    }
                                });

                                totalRtpCount = `${realized}/${total}`;
                            }

                            // Combine identifikasi, analisis, ec, and evaluasi data
                            combinedData.push({
                                ...identifikasiItem,
                                // Extract level_risiko data from the analisis
                                level_risiko_inherit: analisisItem.level_risiko_inherit || '',
                                level_risiko_residual: analisisItem.level_risiko_residual || '',
                                level_risiko_treated: analisisItem.level_risiko_treated || '',
                                ec_count: totalEcCount,  // Total EC count for this identifikasi
                                rtp_count: totalRtpCount,  // Total RTP count for this identifikasi
                            });
                        } else {
                            // If no analisis found, keep default values
                            combinedData.push({
                                ...identifikasiItem,
                                level_risiko_inherit: '',
                                level_risiko_residual: '',
                                level_risiko_treated: '',
                                ec_count: 0,
                                rtp_count: 0,
                            });
                        }

                    } catch (error) {
                        console.error(`Error fetching analisis or evaluasi data for identifikasi ID ${identifikasiItem.id}:`, error);
                        // If there's an error fetching analisis or evaluasi data, set default values
                        combinedData.push({
                            ...identifikasiItem,
                            level_risiko_inherit: '',
                            level_risiko_residual: '',
                            level_risiko_treated: '',
                            ec_count: 0,
                            rtp_count: 0,
                        });
                    }
                }

                setDataStrukturOrganisasi(combinedData);

            } catch (error) {
                console.error("Error fetching data:", error);
                setErrorMessage("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [tahunId, idInstansi]);




    const handleActionClick = (action, row) => {
        const identifikasiId = row.id;
        const analisisId = row.analisis_id;

        if (action === "lihat detail") {
            navigate(`/pengelolaan-risiko/registrasi-risiko/${identifikasiId}`, {
                state: {
                    analisisId,
                },
            });
        } else if (action === "edit") {
            navigate(`/pengelolaan-risiko/registrasi-risiko/${identifikasiId}/edit`);
        } else if (action === "hapus") {
            Swal.fire({
                title: 'Are you sure?',
                text: "You want to delete this data?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, cancel!',
            }).then((result) => {
                if (result.isConfirmed) {
                    console.log(`Deleted user with ID: ${identifikasiId}`);
                }
            });
        }
    };


    const columns = [
        {
            accessorKey: 'tindakan',
            header: () => 'Tindakan',
            cell: (info) => (
                <div className="hstack gap-2 justify-content-center">
                    <Dropdown
                        dropdownItems={actions.map((item) => ({
                            ...item,
                            onClick: () => handleActionClick(item.label.toLowerCase(), info.row.original), // Passing ID for specific action
                        }))}
                        triggerIcon={<FiMoreHorizontal />}
                        triggerClass="avatar-md"
                        triggerPosition="0,21"
                    />
                </div>
            ),
            meta: {
                headerClassName: 'text-end',
            }
        },
        {
            accessorKey: 'pernyataan_risiko',
            header: () => 'Pernyataan Risiko',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'level_risiko_inherit',
            header: () => 'Inherent Risk',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'level_risiko_residual',
            header: () => 'Residual Risk',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'level_risiko_treated',
            header: () => 'Treated Risk',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'level_risiko_treated',
            header: () => 'Actual',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'ec_count',
            header: () => 'Exiting Control',
            cell: (info) => <span>{info.getValue() || 0}</span>,
        },
        {
            accessorKey: 'rtp_count',
            header: () => 'Risk Treatment Plan (RTP)',
            cell: (info) => <span>{info.getValue() || 0}</span>,
        },
    ];

    const handleExportPDF = async () => {
        if (!idInstansi || !tahunId) {
            showToast("warning", "Mohon pilih Instansi dan Tahun terlebih dahulu.");
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const idIndukUnitKerja = localStorage.getItem('induk_unit_kerja_id') || ""; // Can refine this

            // If we don't have induk_unit_kerja context locally, use a default/placeholder or fetch it.
            // For now passing "global_id" workaround, or you can import `useIndukUnitKerja()`
            let induk_unit_id = idInstansi; // Placeholder if unavailable. The API expects id_induk_unit_kerja.

            // Adjusting parameter based on available scope context. Here we use dummy objectID if needed, but the actual app handles it:
            // Assuming the context `useIndukUnitKerja` exists.

            const response = await axios.get(`${API_ENDPOINTS.apiBaseUrl}/export/pdf/register-risiko`, {
                params: {
                    id_instansi: idInstansi,
                    tahun_id: tahunId,
                    id_induk_unit_kerja: "679c4ba2dff6a39cd583bd1c" // TODO: Use dynamic context here
                },
                headers: {
                    Authorization: `Bearer ${token}`
                },
                responseType: 'blob' // Important for file downloads
            });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Register_Risiko_${tahunId}.pdf`); // Fixed name format
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            showToast("success", "PDF berhasil diunduh.");
        } catch (error) {
            console.error("Gagal export PDF:", error);
            showToast("error", "Gagal merender PDF Dokumen. Coba lengkapi Kop Surat terlebih dahulu.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!dataStrukturOrganisasi || dataStrukturOrganisasi.length === 0) {
            showToast("warning", "Tidak ada data untuk diekspor.");
            return;
        }

        try {
            // Transform data for Excel
            const excelData = dataStrukturOrganisasi.map((row, index) => ({
                'No': index + 1,
                'Pernyataan Risiko': row.pernyataan_risiko || '-',
                'Inherent Risk Level': row.level_risiko_inherit || '-',
                'Residual Risk Level': row.level_risiko_residual || '-',
                'Treated Risk Level': row.level_risiko_treated || '-',
                'Existing Control Count': row.ec_count || 0,
                'Risk Treatment Plan Count': row.rtp_count || 0
            }));

            // Create Worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Auto size columns
            const colWidths = [
                { wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }
            ];
            ws['!cols'] = colWidths;

            // Create Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Register Risiko");

            // Trigger Download
            XLSX.writeFile(wb, `Register_Risiko_${tahunId || 'Export'}.xlsx`);
            showToast("success", "Data berhasil diekspor ke Excel!");
        } catch (error) {
            console.error("Gagal export excel:", error);
            showToast("error", "Terjadi kesalahan saat mengekspor data.");
        }
    };

    return (
        <div>
            {loading ? <div>Loading...</div> : ""}
            {errorMessage && <div className="text-danger">{errorMessage}</div>}

            <div className="d-flex justify-content-end mb-3 gap-2">
                <button className="btn btn-success btn-sm" onClick={handleExportExcel} disabled={loading || dataStrukturOrganisasi.length === 0}>
                    <i className="feather-file-text me-2"></i>Export Data (Excel)
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleExportPDF} disabled={loading}>
                    <i className="feather-download me-2"></i>Export Laporan (PDF)
                </button>
            </div>

            <TableResgitrasiRisiko title={"Data Registrasi Risiko"} data={dataStrukturOrganisasi} columns={columns} />
        </div>
    );
};

export default RegisterRisikoTabel;
