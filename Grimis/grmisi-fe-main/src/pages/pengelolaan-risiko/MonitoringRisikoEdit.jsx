import React, { useState } from 'react';
import PageHeader from '@/components/shared/pageHeader/PageHeader';
import Footer from '@/components/shared/Footer';
import MonitoringRisikoEditContent from '@/components/monitoringRisikoEdit/MonitoringRisikoEditContent';

const MonitoringRisikoEdit = () => {
  const [resetKey, setResetKey] = useState(0);
  
  return (
    <>
      <PageHeader>
      </PageHeader>
      <div className='main-content' style={{ minHeight: 'calc(100vh - 60px)' }}>
        <div className='row'>
          <MonitoringRisikoEditContent resetKey={setResetKey} key={resetKey} />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MonitoringRisikoEdit;