import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TableResgitrasiRisiko from '@/components/shared/table/TableRegistrasiRisiko';
import { FiEdit3, FiEye, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import API_ENDPOINTS from '../../config/apiConfig';


const apiBaseUrl = "http://localhost:8000";
const tahun = 2025

const actions = [
    { label: "Lihat Detail", icon: <FiEye /> },
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Hapus", icon: <FiTrash2 /> },
];

const RegisterRisikoTabel = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();

    const [dataStrukturOrganisasi, setDataStrukturOrganisasi] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                // First get all identifikasi-risiko data
                const identifikasiResponse = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoAll(idInstansi, tahun), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const identifikasiData = identifikasiResponse.data || [];
                const combinedData = [];

                // For each identifikasi item, check if there's a matching analisis
                for (const idItem of identifikasiData) {
                    try {
                        // Get specific analisis-risiko for this identifikasi item
                        const analisisResponse = await axios.get(
                            API_ENDPOINTS.getAnalisisRisikoByIdentifikasiRisikoIdTahun(idInstansi, tahun), {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                        );

                        // Get evaluasi-risiko data to extract RTP
                        // const evaluasiResponse = await axios.get(
                        //     `${apiBaseUrl}/api/v1/evaluasi-risiko?identifikasi_risiko_id=${idItem.id}`,
                        //     {
                        //         headers: {
                        //             Authorization: `Bearer ${token}`,
                        //         },
                        //     }
                        // );

                        const analisisData = analisisResponse.data;
                        // const evaluasiData = evaluasiResponse.data;

                        // const rtpCount = evaluasiData && evaluasiData.length > 0 ? evaluasiData[0].rtp_count : 0;

                        // If analisis data exists, combine it with identifikasi data
                        if (analisisData && analisisData.length > 0) {
                            combinedData.push({
                                ...idItem,
                                level_risiko_inherit: analisisData[0].level_risiko_inherit || '',
                                level_risiko_residual: analisisData[0].level_risiko_residual || '',
                                level_risiko_treated: analisisData[0].level_risiko_treated || '',
                                // rtp_count: rtpCount,
                                // Add any other fields from analisis data you need
                            });
                        } else {
                            // If no analisis data, just add the identifikasi data with empty analisis fields
                            combinedData.push({
                                ...idItem,
                                level_risiko_inherit: '',
                                level_risiko_residual: '',
                                level_risiko_treated: '',
                                // rtp_count: rtpCount
                            });
                        }
                    } catch (error) {
                        console.error(`Error fetching analisis data for identifikasi ID ${idItem.id}:`, error);
                        // Add the identifikasi item without analisis data
                        combinedData.push({
                            ...idItem,
                            level_risiko_inherit: '',
                            level_risiko_residual: '',
                            level_risiko_treated: '',
                            rtp_count: 0
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
    }, [tahunRisiko, idInstansi]);

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
            accessorKey: 'ec',
            header: () => 'Exiting Control',
            cell: (info) => <span>{info.getValue() || 0}</span>,
        },
        {
            accessorKey: 'rtp_count',
            header: () => 'Risk Treatment Plan (RTP)',
            cell: (info) => <span>{info.getValue() || 0}</span>,
        },
    ];

    return (
        <div>
            {loading ? <div>Loading...</div> : ""}
            {errorMessage && <div className="text-danger">{errorMessage}</div>}
            <TableResgitrasiRisiko title={"Data Registrasi Risiko"} data={dataStrukturOrganisasi} columns={columns} />
        </div>
    );
};

export default RegisterRisikoTabel;
