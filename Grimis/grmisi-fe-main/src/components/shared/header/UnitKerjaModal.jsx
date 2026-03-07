import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useIndukUnitKerja } from '../../../context/IndukUnitKerjaContext';
import { useAppLoading } from '../../../context/AppLoadingContext';
import { useTahun } from '../../../context/TahunContext';
import { useInstansi } from '../../../context/InstansiContext';
import API_ENDPOINTS from '../../../config/apiConfig';

const UnitKerjaModal = () => {
    const navigate = useNavigate();
    const { idInstansi } = useInstansi();
    const { setIdIndukUnitKerja, setIdTemplate } = useIndukUnitKerja();
    const { fetchAvailableYears } = useTahun();
    const { setLoadingRedirect, setLoadingMessage } = useAppLoading();

    const [unitKerjaList, setUnitKerjaList] = useState([]);
    const [selectedUnitKerja, setSelectedUnitKerja] = useState(null);

    useEffect(() => {
        const fetchUnitKerja = async () => {
            if (!idInstansi) return;

            try {
                const token = localStorage.getItem('access_token');

                // First try using struktur-organisasi endpoint
                try {
                    const response = await axios.get(API_ENDPOINTS.getStrukturOrganisasiAvailableIndukUnits(idInstansi), {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const data = response.data;

                    if (Array.isArray(data) && data.length > 0) {
                        setUnitKerjaList(data);
                        const selected = data.find(unit => unit.id === localStorage.getItem('id_induk_unit_kerja')) || data[0];
                        setSelectedUnitKerja(selected);
                        return; // Successfully got data, no need to try fallback
                    }
                } catch (error) {
                    console.warn("Failed to get data from struktur-organisasi endpoint, trying fallback:", error);
                    // Continue to fallback
                }

                // Fallback to induk-unit-kerja endpoint
                try {
                    const fallbackResponse = await axios.get(API_ENDPOINTS.getIndukUnitKerjaByInstansiId(idInstansi), {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const fallbackData = fallbackResponse.data;

                    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                        setUnitKerjaList(fallbackData);
                        const selected = fallbackData.find(unit => unit.id === localStorage.getItem('id_induk_unit_kerja')) || fallbackData[0];
                        setSelectedUnitKerja(selected);
                    } else {
                        console.error("No unit kerja data available from fallback endpoint");
                    }
                } catch (fallbackError) {
                    console.error("Both attempts to fetch unit kerja failed:", fallbackError);
                }
            } catch (error) {
                console.error("Failed to fetch unit kerja data:", error);
            }
        };

        fetchUnitKerja();
    }, [idInstansi]);

    const handleUnitKerjaSelect = async (unitKerja) => {

        localStorage.removeItem('tahun');
        localStorage.removeItem('id_template');
        localStorage.setItem('id_induk_unit_kerja', unitKerja.id);
        setSelectedUnitKerja(unitKerja);
        setIdIndukUnitKerja(unitKerja.id);
        setIdTemplate('');

        const tahunResult = await fetchAvailableYears();
        if (!tahunResult) {
            localStorage.setItem('dashboard_error', "Tidak ada data tahun tersedia.");
        } else {
            const token = localStorage.getItem('access_token');
            const tahun = localStorage.getItem('tahun');
            const res = await axios.get(
                API_ENDPOINTS.getPetaTemplateByIndukUnitKerjaId(tahun, unitKerja.id),
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const templates = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
            if (templates.length && templates[0]?.id) {
                const templateId = templates[0].id;
                setIdTemplate(templateId);
                localStorage.setItem('id_template', templateId);
            } else {
                setIdTemplate('');
                localStorage.removeItem('id_template');
                localStorage.setItem('dashboard_error', "Template belum tersedia untuk unit kerja ini.");
            }
        }

        setLoadingMessage('Mengganti Unit Kerja...');
        setLoadingRedirect(true);
        navigate('/');
    };

    return (
        <div className="dropdown nxl-h-item">
            <button
                type="button"
                className="nxl-navigation-toggle me-3 btn btn-light text-dark border border-dark rounded-pill"
                data-bs-toggle="dropdown"
                role="button"
                data-bs-auto-close="outside"
            >
                <span>{selectedUnitKerja?.nama_induk_unit || 'Pilih Unit Kerja'}</span>
            </button>
            <div className="dropdown-menu dropdown-menu-end nxl-h-dropdown">
                <h6 className="fw-bold text-dark mb-2 px-3">Pilih Unit Kerja</h6>
                <div className="company-list">
                    {unitKerjaList.length > 0 ? (
                        unitKerjaList.map((unit) => (
                            <Link
                                key={unit.id}
                                to="#"
                                className={`dropdown-item text-wrap text-break ${selectedUnitKerja?.id === unit.id ? 'active' : ''}`}
                                onClick={() => handleUnitKerjaSelect(unit)}
                            >
                                {unit.nama_induk_unit}
                            </Link>
                        ))
                    ) : (
                        <span className="text-muted px-3">Tidak ada data unit kerja</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UnitKerjaModal;
