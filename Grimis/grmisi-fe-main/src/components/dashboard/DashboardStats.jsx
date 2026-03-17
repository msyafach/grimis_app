import React, { useState, useEffect, useCallback } from 'react';
import { Card } from 'react-bootstrap';
import axios from 'axios';
import { useInstansi } from '@/context/InstansiContext';
import { useTahun } from '@/context/TahunContext';
import { useIndukUnitKerja } from '@/context/IndukUnitKerjaContext';
import API_ENDPOINTS from '@/config/apiConfig';
import ContentLoaderWrapper from '@/components/shared/ContentLoaderWrapper';
import { FiArrowUpRight } from "react-icons/fi";

const DashboardStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    risiko: {
      total: 0,
      dibawahSelera: 0,
      persentaseDibawahSelera: 0
    },
    pengendalian: {
      total: 0,
      efektif: 0,
      persentaseEfektif: 0
    },
    rtp: {
      total: 0,
      terlaksana: 0,
      persentaseTerlaksana: 0
    }
  });
  
  const { idInstansi } = useInstansi();
  const { tahunId } = useTahun();
  const { idIndukUnitKerja, idTemplate } = useIndukUnitKerja();

  const fetchData = useCallback(async () => {
    if (!idInstansi || !tahunId || !idIndukUnitKerja) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');


      // Try to use the dedicated stats endpoint if available
      try {
        const statsResponse = await axios.get(
          API_ENDPOINTS.getRiskStats(tahunId, idInstansi, idIndukUnitKerja),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (statsResponse.data) {
          // Directly use the values from the API
          // The API now correctly defines pengendalian_efektif as controls associated with risks below appetite
          setStats({
            risiko: {
              total: statsResponse.data.total_risiko || 0,
              dibawahSelera: statsResponse.data.risiko_dibawah_selera || 0,
              persentaseDibawahSelera: statsResponse.data.persentase_dibawah_selera || 0
            },
            pengendalian: {
              total: statsResponse.data.total_pengendalian || 0,
              efektif: statsResponse.data.pengendalian_efektif || 0,
              persentaseEfektif: statsResponse.data.persentase_pengendalian_efektif || 0
            },
            rtp: {
              total: statsResponse.data.total_rtp || 0,
              terlaksana: statsResponse.data.rtp_terlaksana || 0,
              persentaseTerlaksana: statsResponse.data.persentase_rtp_terlaksana || 0
            }
          });
          setLoading(false);
          return;
        }
      } catch (error) {
      }

      // Fallback: Get risk summary from existing endpoints
      const riskSummaryResponse = await axios.get(
        API_ENDPOINTS.getIdentifikasiRisikoSummaryByIdentifikasi(idInstansi, idIndukUnitKerja, tahunId),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Calculate statistics
      const risikoTotal = riskSummaryResponse.data?.total_risiko || 0;
      const risikoDibawahSelera = riskSummaryResponse.data?.risiko_dibawah_selera || 0;
      const persentaseDibawahSelera = risikoTotal > 0 
        ? Math.round((risikoDibawahSelera / risikoTotal) * 100) 
        : 0;

      // For evaluasi and RTP, we need to calculate from the summary data
      // Parse RTP data from summary - handle the new format "realized/total"
      let rtpTerlaksana = 0;
      let rtpTotal = 0;
      
      riskSummaryResponse.data?.forEach(risk => {
        if (typeof risk.rtp_count === 'string' && risk.rtp_count.includes('/')) {
          const [realized, total] = risk.rtp_count.split('/').map(Number);
          rtpTerlaksana += realized;
          rtpTotal += total;
        }
      });
      
      const persentaseRtpTerlaksana = rtpTotal > 0 
        ? Math.round((rtpTerlaksana / rtpTotal) * 100) 
        : 0;

      // For pengendalian, identify which are effective (associated with risks below appetite)
      const pengendalianTotal = riskSummaryResponse.data?.reduce((acc, item) => acc + (item.attachment_count || 0), 0) || 0;
      
      // In the fallback method, we can't accurately determine which controls are effective
      // So we'll estimate based on the proportion of risks that are below appetite
      const pengendalianEfektif = risikoDibawahSelera > 0 && risikoTotal > 0
        ? Math.round((risikoDibawahSelera / risikoTotal) * pengendalianTotal)
        : 0;
        
      const persentasePengendalianEfektif = pengendalianTotal > 0 
        ? Math.round((pengendalianEfektif / pengendalianTotal) * 100)
        : 0;

      setStats({
        risiko: {
          total: risikoTotal,
          dibawahSelera: risikoDibawahSelera,
          persentaseDibawahSelera
        },
        pengendalian: {
          total: pengendalianTotal,
          efektif: pengendalianEfektif,
          persentaseEfektif: persentasePengendalianEfektif
        },
        rtp: {
          total: rtpTotal,
          terlaksana: rtpTerlaksana,
          persentaseTerlaksana: persentaseRtpTerlaksana
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [idInstansi, tahunId, idIndukUnitKerja]);

  // Refresh data when dependencies change
  useEffect(() => {
    fetchData();
  }, [idInstansi, tahunId, idIndukUnitKerja, idTemplate, fetchData]);

  // Also refresh on component mount
  useEffect(() => {
    fetchData();
    
    // Set up event listener for custom refresh event
    const handleRefreshEvent = () => fetchData();
    window.addEventListener('dashboard-refresh', handleRefreshEvent);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefreshEvent);
    };
  }, [fetchData]);

  const renderBarChart = (value, total, percentage) => {
    return (
      <div className="position-relative">
        <div className="progress" style={{ height: '30px' }}>
          <div 
            className="progress-bar bg-success" 
            role="progressbar" 
            style={{ width: `${percentage}%` }} 
            aria-valuenow={percentage} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
            {percentage}%
          </div>
          <div 
            className="progress-bar bg-danger" 
            role="progressbar" 
            style={{ width: `${100 - percentage}%` }} 
            aria-valuenow={100 - percentage} 
            aria-valuemin="0" 
            aria-valuemax="100"
          >
            {100 - percentage}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <ContentLoaderWrapper loading={loading} message="Memuat data statistik...">
      <div className="col-lg-4 col-md-12">
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Risiko</h5>
            <FiArrowUpRight />
          </Card.Header>
          <Card.Body>
            {renderBarChart(stats.risiko.dibawahSelera, stats.risiko.total, stats.risiko.persentaseDibawahSelera)}
            <div className="mt-3 text-center">
              <p className="mb-0">Jumlah Risiko Dibawah Selera : {stats.risiko.dibawahSelera}</p>
              <p className="mb-0">Jumlah Risiko Total : {stats.risiko.total}</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className="col-lg-4 col-md-12">
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Efektivitas Pengendalian</h5>
            <FiArrowUpRight />
          </Card.Header>
          <Card.Body>
            {renderBarChart(stats.pengendalian.efektif, stats.pengendalian.total, stats.pengendalian.persentaseEfektif)}
            <div className="mt-3 text-center">
              <p className="mb-0">Jumlah Pengendalian Efektif : {stats.pengendalian.efektif}</p>
              <p className="mb-0">Jumlah Pengendalian Total : {stats.pengendalian.total}</p>
            </div>
          </Card.Body>
        </Card>
      </div>

      <div className="col-lg-4 col-md-12">
        <Card className="mb-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">RTP</h5>
            <FiArrowUpRight />
          </Card.Header>
          <Card.Body>
            {renderBarChart(stats.rtp.terlaksana, stats.rtp.total, stats.rtp.persentaseTerlaksana)}
            <div className="mt-3 text-center">
              <p className="mb-0">RTP Terlaksana : {stats.rtp.terlaksana}</p>
              <p className="mb-0">RTP Total : {stats.rtp.total}</p>
            </div>
          </Card.Body>
        </Card>
      </div>
    </ContentLoaderWrapper>
  );
};

export default DashboardStats; 