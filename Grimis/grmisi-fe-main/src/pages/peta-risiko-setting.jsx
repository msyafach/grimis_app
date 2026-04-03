import React from "react";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import DashboardMatriks from "@/components/petaRisikoSetting/DashboardMatriks";

const PetaRisikoSetting = () => {
  return (
    <>
      <PageHeader title="Setting Matriks Risiko" />
      <div className="main-content">
        <div className="card p-4">
          <div className="mb-4">
            <h4 className="mb-1">Setting Matriks Risiko</h4>
            <p className="text-muted mb-0">
              Pilih skala dampak dan frekuensi yang akan digunakan, misal skala
              3 (3 x 3), skala 4 (4 x 4), atau skala 5 (5 x 5). Anda juga dapat
              menggunakan fitur Salin Template untuk menggunakan template yang
              sudah ada.
            </p>
          </div>
          <DashboardMatriks />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PetaRisikoSetting;
