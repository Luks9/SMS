import React, { useEffect, useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import Layout from '../../components/Layout';
import RemTabelaAvaliador from './RemTabelaAvaliador';
// import RemCharts from './RemCharts'; // TODO: Descomentar quando houver dados suficientes para gráficos
import { identifyCriticalIssues, formatSafetyRate, formatNumber } from '../../utils/safetyMetrics';
import '../../styles/remSafety.css';

const RemAvaliador = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useContext(AuthContext);

  // Identificar alertas críticos de segurança (não agregar métricas)
  const criticalAlerts = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const issues = identifyCriticalIssues(safeData);
    
    const companySet = new Set();
    safeData.forEach((item) => {
      const companyName = item?.rem?.company_name;
      if (companyName) companySet.add(companyName);
    });

    return {
      totalRecords: safeData.length,
      totalCompanies: companySet.size,
      fatalities: issues.fatalities,
      highRiskCompanies: issues.highLTIFR,
      highSeverity: issues.highSeverity,
      hasCriticalIssues: issues.fatalities.length > 0 || issues.highLTIFR.length > 0
    };
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      try {
        const response = await axios.get('/api/rems/combined-data/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setData(response.data || []); // Garante que data seja um array
      } catch (error) {
        console.error('Erro ao buscar dados combinados:', error);
        setData([]); // Define data como um array vazio em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  return (
    <Layout>
      <section className="section">
        <div className="container">
          {/* Header Section */}
          <div
            className="box"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
              color: '#f8fafc',
            }}
          >
            <div className="columns is-vcentered">
              <div className="column is-8">
                <h1 className="title mb-2" style={{ color: '#f8fafc' }}>
                  Dashboard de Avaliação SMS
                </h1>
                <p className="subtitle is-6" style={{ color: '#e2e8f0' }}>
                  Análise individual de desempenho de segurança por empresa - comparações e tendências
                </p>
              </div>
              <div className="column is-4">
                <div className="columns is-multiline">
                  <div className="column is-6">
                    <div className="has-text-centered">
                      <p className="heading" style={{ color: '#cbd5f5' }}>
                        Registros
                      </p>
                      <p className="title is-4" style={{ color: '#f8fafc' }}>
                        {criticalAlerts.totalRecords}
                      </p>
                    </div>
                  </div>
                  <div className="column is-6">
                    <div className="has-text-centered">
                      <p className="heading" style={{ color: '#cbd5f5' }}>
                        Empresas
                      </p>
                      <p className="title is-4" style={{ color: '#f8fafc' }}>
                        {criticalAlerts.totalCompanies}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Alerts Section */}
          {criticalAlerts.hasCriticalIssues && (
            <div className="notification is-danger is-light mt-4">
              <p className="title is-5 mb-3">⚠️ Alertas Críticos de Segurança</p>
              
              {criticalAlerts.fatalities.length > 0 && (
                <div className="box has-background-danger mb-3">
                  <p className="subtitle is-6 has-text-white mb-2">
                    <strong>🚨 FATALIDADES REGISTRADAS</strong>
                  </p>
                  <div className="content has-text-white">
                    <ul>
                      {criticalAlerts.fatalities.map((item, idx) => (
                        <li key={idx}>
                          <strong>{item.company}</strong> - {new Date(item.periodo).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} 
                          : {item.count} fatalidade{item.count > 1 ? 's' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {criticalAlerts.highRiskCompanies.length > 0 && (
                <div className="box has-background-warning-light">
                  <p className="subtitle is-6 has-text-warning-dark mb-2">
                    <strong>📊 Taxa de Acidentes com Afastamento Elevada (LTIFR {'>'} 5.0)</strong>
                  </p>
                  <div className="content">
                    <ul>
                      {criticalAlerts.highRiskCompanies.slice(0, 5).map((item, idx) => (
                        <li key={idx}>
                          <strong>{item.company}</strong> - {new Date(item.periodo).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} 
                          : {formatSafetyRate(item.value)}
                        </li>
                      ))}
                      {criticalAlerts.highRiskCompanies.length > 5 && (
                        <li className="has-text-grey">
                          ... e mais {criticalAlerts.highRiskCompanies.length - 5} empresa(s)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {!criticalAlerts.hasCriticalIssues && criticalAlerts.totalRecords > 0 && (
            <div className="notification is-success is-light mt-4">
              <p className="title is-6">✅ Sem alertas críticos no período atual</p>
              <p>Todas as empresas estão dentro dos parâmetros aceitáveis de segurança.</p>
            </div>
          )}

          {/* Charts Section - Comentado temporariamente até ter dados suficientes */}
          {/* <div className="mt-5">
            <RemCharts data={data} />
          </div> */}

          {/* Table Section */}
          <div className="mt-6">
            <RemTabelaAvaliador data={data} loading={loading} />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default RemAvaliador;