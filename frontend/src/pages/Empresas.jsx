import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';

const Empresas = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <Layout>
      <h1 className="title">Empresas</h1>
      
    </Layout>
  );
};

export default Empresas;