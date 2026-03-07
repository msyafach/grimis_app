import.meta.env
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Table from '@/components/shared/table/Table';
import API_ENDPOINTS from '../../config/apiConfig';
import ContentLoaderWrapper from '../shared/ContentLoaderWrapper';
import { getColumns } from './Columns';

const AprrovalIdentifikasiRisikoTabel = () => {
    const navigate = useNavigate();
    const type = "IDENTIFIKASI"
    const [approval, setApproval] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError("");
            try {
                const token = localStorage.getItem('access_token');
                const approvalResponse = await axios.get(API_ENDPOINTS.getAprrovalByType(type), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const approvalData = approvalResponse.data || [];
                const combinedData = [];

                for (const approvalItem of approvalData) {
                    try {
                        const identifikasiResponse = await axios.get(
                            API_ENDPOINTS.getIdentifikasiRisikoById(approvalItem.id_identifikasi_risiko),
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );
                        const identifikasiData = identifikasiResponse.data || [];

                        if (identifikasiData && Object.keys(identifikasiData).length > 0) {
                            combinedData.push({
                                ...approvalItem,
                                ...identifikasiData
                            });
                        }
                    } catch (err) {
                        if (import.meta.env.MODE === 'development') {
                            console.error(`Error fetching identifikasi data for identifikasi ID ${approvalItem.id_identifikasi_risiko}:`, err);
                        }
                    }
                }
                setApproval(combinedData);
            } catch (err) {
                if (import.meta.env.MODE === 'development') {
                    console.error(`Error fetching approvavl data:`, err);
                }
                setError("Gagal mengambil data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type]);

    const handleActionClick = useCallback((action, row) => {
        switch (action) {
            case 'view':
                navigate(`/approval-identifikasi/detail/${row.id}`);
                break;
            case 'edit':
                navigate(`/approval-identifikasi/edit/${row.id}`);
                break;
            default:
                console.warn('Action tidak dikenali:', action);
        }
    }, [navigate]);

    const columns = useMemo(() => getColumns(handleActionClick), [handleActionClick]);

    return (
        <>
            <ContentLoaderWrapper loading={loading} error={error}>
                <Table title={"Data Aprroval Identifikasi Risiko"} data={approval} columns={columns} />
            </ContentLoaderWrapper>
        </>
    );
};

export default AprrovalIdentifikasiRisikoTabel;
