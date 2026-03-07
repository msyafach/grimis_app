import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import { FiEdit3, FiEye, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';
import Dropdown from '@/components/shared/Dropdown';
import { showToast } from '@/utils/toast';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import { useTahun } from '../../context/TahunContext';
import API_ENDPOINTS from '../../config/apiConfig';


const apiBaseUrl = "http://localhost:8000";
const idInstansi = "67baf4c72465ae8b7645ea5a";
const tahunRisiko = 2025

const actions = [
    { label: "Lihat Detail", icon: <FiEye /> },
    { label: "Edit", icon: <FiEdit3 /> },
    { label: "Hapus", icon: <FiTrash2 /> },
];

const EvaluasiRisikoTabel = () => {
    const navigate = useNavigate();

    const [dataEvaluasiRisiko, setDataEvaluasiRisiko] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");


    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');

                // First get all identifikasi-risiko data
                const identifikasiResponse = await axios.get(`${apiBaseUrl}/api/v1/identifikasi-risiko?tahun=${tahunRisiko}&id_instansi=${idInstansi}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const identifikasiData = identifikasiResponse.data;


                const combinedData = await Promise.all(
                    identifikasiData.map(async (item) => {
                        let namaSasaran = "";
                        let namaProbis = "";
                        let levelRisikoInherit = "";
                        let levelRisikoResidual = "";
                        let levelRisikoTreated = "";

                        try {
                            const konteksSasaranResponse = await axios.get(
                                `${apiBaseUrl}/api/v1/konteks/${item.id_konteks_sasaran}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            namaSasaran = konteksSasaranResponse.data?.nama || "";

                            const konteksProbisResponse = await axios.get(
                                `${apiBaseUrl}/api/v1/konteks/${item.id_konteks_probis}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            namaProbis = konteksProbisResponse.data?.nama || "";
                        } catch (err) {
                            console.error("Error fetching konteks:", err);
                        }

                        try {
                            const analisisResponse = await axios.get(
                                `${apiBaseUrl}/api/v1/analisis-risiko?tahun=${tahunRisiko}&identifikasi_risiko_id=${item.id}`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            const analisisData = analisisResponse.data;
                            if (analisisData && analisisData.length > 0) {
                                levelRisikoInherit = analisisData[0].level_risiko_inherit || "";
                                levelRisikoResidual = analisisData[0].level_risiko_residual || "";
                                levelRisikoTreated = analisisData[0].level_risiko_treated || "";
                            }
                        } catch (error) {
                            console.warn(`Gagal fetch analisis risiko untuk ${item.id}`);
                        }

                        return {
                            ...item,
                            nama_sasaran: namaSasaran,
                            nama_probis: namaProbis,
                            level_risiko_inherit: levelRisikoInherit,
                            level_risiko_residual: levelRisikoResidual,
                            level_risiko_treated: levelRisikoTreated,
                        };
                    })
                );

                setDataEvaluasiRisiko(combinedData);

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
            navigate(`/pengendalian-risiko/evaluasi-risiko/${identifikasiId}`, {
                state: {
                    analisisId,
                },
            });
        } else if (action === "edit") {
            navigate(`/pengendalian-risiko/evaluasi-risiko/${identifikasiId}/edit`);
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

    const renderBadge = (value) => {
        if (value === null || value === '' || value === undefined) return <span>-</span>;
        const num = Number(value);
        let badgeClass = '';
        if (num >= 1 && num <= 15) badgeClass = 'bg-light-success text-success';
        else if (num >= 16 && num <= 20) badgeClass = 'bg-light-warning text-warning';
        else if (num >= 21 && num <= 25) badgeClass = 'bg-light-danger text-danger';
        else badgeClass = 'bg-light-secondary text-secondary';

        return (
            <span className={`badge ${badgeClass} rounded-pill px-3 py-2 fw-bold`}>{num}</span>
        );
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
            id: 'pernyataan_dan_dampak',
            header: () => 'Pernyataan Risiko',
            cell: (info) => {
                const { pernyataan_risiko, nama_sasaran, nama_probis } = info.row.original;
                return (
                    <>
                        <div>{pernyataan_risiko}</div>
                        <div className="fw-light text-muted">
                            {nama_sasaran} | {nama_probis}
                        </div>
                    </>
                );
            },
        },
        {
            accessorKey: 'level_risiko_residual',
            header: () => 'Residual Risk',
            cell: (info) => renderBadge(info.getValue()),
        },
        {
            accessorKey: 'akar_penyebab',
            header: () => 'Akar Penyebab',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'jenis_penyebab_id',
            header: () => 'Jenis Penyebab',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'pengendalian',
            header: () => 'Mitigasi',
            cell: (info) => <span>{info.getValue()}</span>,
        },
        {
            accessorKey: 'komentar',
            header: () => 'Komentar',
            cell: (info) => <span>{info.getValue()}</span>,
        },
    ];

    return (
        <div>
            {loading ? <div>Loading...</div> : ""}
            {errorMessage && <div className="text-danger">{errorMessage}</div>}
            <Table title={"Data Evaluasi Risiko"} data={dataEvaluasiRisiko} columns={columns} />
        </div>
    );
};

export default EvaluasiRisikoTabel;
