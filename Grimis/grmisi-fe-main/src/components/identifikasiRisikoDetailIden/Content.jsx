import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import axios from 'axios';
import CardHeader from '@/components/shared/CardHeader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { useInstansi } from '../../context/InstansiContext';
import { useIndukUnitKerja } from '../../context/IndukUnitKerjaContext';
import API_ENDPOINTS from '../../config/apiConfig';
import { showToast } from '@/utils/toast';

const IdentifikasiRisikoDetailIdenContent = ({ title = "Detail Identifikasi Risiko" }) => {
    const { isRemoved, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
    const { identifikasiId } = useParams();
    const { idInstansi } = useInstansi();
    const { idIndukUnitKerja } = useIndukUnitKerja();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    const [labelData, setLabelData] = useState({
        jenisSasaran: '',
        konteksSasaran: '',
        indikator: '',
        konteksProbis: '',
        kategoriRisiko: '',
    });

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('access_token');
                const headers = { Authorization: `Bearer ${token}` };

                // Ambil detail identifikasi
                const identifikasiRes = await axios.get(API_ENDPOINTS.getIdentifikasiRisikoById(identifikasiId), { headers });
                const detail = identifikasiRes.data;
                setData(detail);

                // Ambil semua referensi data
                const [strukturRes, sasaranRes, probisRes, indikatorRes, kategoriRes] = await Promise.all([
                    axios.get(API_ENDPOINTS.getStrukturOrganisasi(idInstansi, idIndukUnitKerja), { headers }),
                    axios.get(API_ENDPOINTS.getKonteksSasaranAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getKonteksProbisAll(idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getIndikatorAll(detail.id_konteks_sasaran, idInstansi), { headers }),
                    axios.get(API_ENDPOINTS.getKategoriRisikoAll(idInstansi), { headers }),
                ]);

                // Jenis Sasaran
                const jenisKonteks = strukturRes.data
                    .flatMap(s => s.jenis_konteks)
                    .find(j => j.id === detail.id_jenis_konteks_sasaran);

                // Konteks Sasaran
                const konteksSasaran = sasaranRes.data.find(s => s.id === detail.id_konteks_sasaran);

                // Konteks Probis
                const konteksProbis = probisRes.data.find(p => p.id === detail.id_konteks_probis);

                // Indikator
                const indikator = indikatorRes.data.find(i => i.id === detail.id_indikator);

                // Kategori Risiko
                const kategori = kategoriRes.data.find(k => k.id === detail.id_kategori_risiko);

                setLabelData({
                    jenisSasaran: jenisKonteks?.nama || '',
                    konteksSasaran: konteksSasaran?.nama || '',
                    indikator: indikator?.nama || '',
                    konteksProbis: konteksProbis?.nama || '',
                    kategoriRisiko: kategori?.nama || '',
                });

            } catch (err) {
                console.error(err);
                setError('Gagal mengambil detail identifikasi risiko.');
                showToast('error', 'Gagal mengambil data.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [identifikasiId, idInstansi, idIndukUnitKerja]);


    const isByAI = !!data?.deskripsi;
    if (isRemoved) return null;

    return (
        <div className="card stretch stretch-full">
            <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
            <div className="card-body">
                <ContentLoaderWrapper loading={loading} error={error}>
                    <div className="row">
                        <div className="col-12 mb-4">
                            <label className="form-label">Jenis Sasaran</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={labelData.jenisSasaran} disabled />
                        </div>

                        <div className="col-12 mb-4">
                            <label className="form-label">Konteks Sasaran</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={labelData.konteksSasaran} disabled />
                        </div>

                        <div className="col-12 mb-4">
                            <label className="form-label">Indikator</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={labelData.indikator} disabled />
                        </div>

                        <div className="col-12 mb-4">
                            <label className="form-label">Konteks Probis</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={labelData.konteksProbis} disabled />
                        </div>

                        {isByAI ? (
                            <>
                                <div className="col-12 mb-4">
                                    <label className="form-label">Pernyataan Risiko (AI)</label>
                                    <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data?.pernyataan_risiko || ''} disabled />
                                </div>
                                <div className="col-12 mb-4">
                                    <label className="form-label">Deskripsi Risiko</label>
                                    <textarea className="form-control form-control-sm rounded-4 bg-light" rows={3} value={data?.deskripsi || ''} disabled />
                                </div>
                            </>
                        ) : (
                            <div className="col-12 mb-4">
                                <label className="form-label">Pernyataan Risiko (Kamus)</label>
                                <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={data?.pernyataan_risiko || ''} disabled />
                            </div>
                        )}

                        <div className="col-12 mb-4">
                            <label className="form-label">Kategori Risiko</label>
                            <input type="text" className="form-control form-control-sm rounded-4 bg-light" value={labelData.kategoriRisiko} disabled />
                        </div>

                        <div className="col-12 mb-4">
                            <label className="form-label">Uraian Dampak</label>
                            <textarea className="form-control form-control-sm rounded-4 bg-light" rows={3} value={data?.uraian_dampak || ''} disabled />
                        </div>
                    </div>
                </ContentLoaderWrapper>
            </div>
        </div>
    );
};

IdentifikasiRisikoDetailIdenContent.propTypes = {
    title: PropTypes.string,
};
export default IdentifikasiRisikoDetailIdenContent;
