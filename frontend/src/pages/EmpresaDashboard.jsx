import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <Layout>
      <h1 className="title">Bem-vindo Empresa, {user?.name}</h1>
      
    </Layout>
  );
};

export default Dashboard;
