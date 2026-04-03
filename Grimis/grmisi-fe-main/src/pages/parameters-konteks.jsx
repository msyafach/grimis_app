import React, { useState } from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import KonteksSasaranHeader from "@/components/konteksSasaran/KonteksSasaranHeader";
import KonteksSasaranTabel from "@/components/konteksSasaran/KonteksSasaranTabel";
import KonteksProbisHeader from "@/components/konteksProbis/KonteksProbisHeader";
import KonteksProbisTabel from "@/components/konteksProbis/KonteksProbisTabel";
import Footer from "@/components/shared/Footer";
import { Tab, Tabs } from "react-bootstrap";

const Konteks = () => {
  const [key, setKey] = useState("sasaran");

  return (
    <>
      <PageHeader title="Konteks">
        {key === "sasaran" ? <KonteksSasaranHeader /> : <KonteksProbisHeader />}
      </PageHeader>
      <div className="main-content" style={{ minHeight: "calc(100vh - 60px)" }}>
        <div className="card mb-3">
          <div className="card-body">
            <Tabs
              id="konteks-tabs"
              activeKey={key}
              onSelect={(k) => setKey(k)}
              className="mb-3 custom-tabs"
            >
              <Tab eventKey="sasaran" title="Sasaran">
                <div className="row mt-3">
                  <KonteksSasaranTabel />
                </div>
              </Tab>
              <Tab eventKey="probis" title="Probis">
                <div className="row mt-3">
                  <KonteksProbisTabel />
                </div>
              </Tab>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Konteks;
