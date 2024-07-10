import React from "react";
import PageContainer from "../Container";
import AdminHeader from "../../components/AdminHeader";
import { Typography } from "@mui/material";

export const AdminHomepage = () => {
  return (
    <div>
      <AdminHeader />
      <PageContainer>
        <Typography
          color="black"
          textAlign="center"
          justifyContent="center"
          paddingLeft={5}
        >
          admin homepage
        </Typography>
      </PageContainer>
    </div>
  );
};

export default AdminHomepage;
