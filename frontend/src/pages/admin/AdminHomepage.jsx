import React from "react";
import PageContainer from "../container";
import AdminHeader from "../../components/AdminHeader";

export const AdminHomepage = () => {
  return (
    <div>
      <AdminHeader />
      <PageContainer>
        <h1 color="black"> admin homepage </h1>
      </PageContainer>
    </div>
  );
};

export default AdminHomepage;
