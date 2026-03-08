import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';

const Dashboard = () => {
  const { user, selectedCompany } = useContext(AuthContext);
  const fallbackCompany =
    selectedCompany ||
    user?.company ||
    (user?.companies?.length === 1 ? user.companies[0] : null);
  const companyName = fallbackCompany?.name || null;

  return (
    <Layout>
      <h1 className="title">
        Bem-vindo{companyName ? `, ${companyName}` : ''}
      </h1>
      {!companyName && (
        <article className="message is-warning">
          <div className="message-body">
            Sua conta foi autenticada, mas ainda nao possui empresa vinculada.
            Solicite ao administrador a associacao da empresa para liberar os modulos da area empresa.
          </div>
        </article>
      )}
    </Layout>
  );
};

export default Dashboard;
