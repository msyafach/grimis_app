import PropTypes from 'prop-types';

const CardIdentifikasiRisiko = ({ identifikasiRisiko, cardHeader }) => {
    if (!identifikasiRisiko) return null;

    return (
        <>
            <div className="card">
                {cardHeader && (
                    <div >
                        {cardHeader}
                    </div>
                )}
                <div className="col-12 bg-light p-4 rounded-4 mt-3 mb-3">
                    <h5 className="p-0">Informasi </h5>
                    <div className="m-2">
                        <strong>Sasaran {identifikasiRisiko.konteks_sasaran.nama || '-'} | Probis {identifikasiRisiko.konteks_probis.nama || '-'}</strong> <br />
                        <strong>Pernyataan Risiko:</strong> {identifikasiRisiko.pernyataan_risiko}<br />
                        <strong>Deskripsi:</strong> {identifikasiRisiko.deskripsi || '-'}<br />
                        <strong>Dampak:</strong> {identifikasiRisiko.uraian_dampak || '-'}<br />
                    </div>
                </div>
            </div>
        </>
    );
};

CardIdentifikasiRisiko.propTypes = {
    identifikasiRisiko: PropTypes.object,
    cardHeader: PropTypes.node
};

export default CardIdentifikasiRisiko;
