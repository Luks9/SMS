import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUsers, faGasPump, faUserSlash } from '@fortawesome/free-solid-svg-icons';
import RemTable from './RemTable'


const RemCompany = ({ companyId }) => {
  const [totalEmpregados, setTotalEmpregados] = useState(0);
  const [totalDemitidos, setTotalDemitidos] = useState(0);
  const [totalDiesel, setTotalDiesel] = useState(0);
  const [rems, setRems] = useState([]);
  const { getToken } = useContext(AuthContext);


  useEffect(() => {
      const fetchData = async () => {
          try {
              const token = getToken();
              const response = await axios.get(`/api/rems/combined-data/${companyId}`, {
                  headers: {
                      Authorization: `Bearer ${token}`,
                  },
              });

              const combinedData = response.data.map((item) => {
                  const rem = item.rem;
                  const diesel = item.consumo_diesel || {};
                  const demitidos = item.funcionarios_demitidos || {};

                  const formattedPeriodo = rem.periodo
                      ? moment(rem.periodo).format('MM/YYYY')
                      : '';

                  return {
                      ...rem,
                      periodo_formatado: formattedPeriodo,
                      consumo_diesel: diesel.diesel_consumido || 0,
                      funcionarios_demitidos: demitidos.funcionarios_demitidos || 0,
                  };
              });

              setRems(combinedData);

              const lastMonthData = response.data.sort((a, b) =>
                  new Date(b.rem.periodo) - new Date(a.rem.periodo)
              )[0];

              setTotalEmpregados(lastMonthData?.rem?.empregados || 0);

              // Calculate totals for all months
              const totalDemitidos = combinedData.reduce(
                  (sum, item) => sum + item.funcionarios_demitidos,
                  0
              );
              setTotalDemitidos(totalDemitidos);

              const totalDiesel = combinedData.reduce(
                  (sum, item) => sum + item.consumo_diesel,
                  0
              );
              setTotalDiesel(totalDiesel);
          } catch (err) {
              console.error('Erro ao buscar os dados:', err);
          }
      };

      fetchData();
  }, [companyId, getToken]);



  return (
    <Layout>
        <h1 className="title">Relatório Estatístico</h1>

        <div className='columns'>   
                <div className="column is-12 has-text-right">
                    <div className='buttons is-right'>
                        <Link to="/rem-empresa/novo" className="button is-primary" title='Novo REM'>
                            <span><FontAwesomeIcon icon={faPlus} /> Novo REM</span>
                        </Link>
                    </div>
                </div>
            </div>
            <div className='columns'>
                <div className='column'>
                    <div className='card'>
                        <div className='card-content'>
                            <div className="level is-mobile">
                                <div className="level-item">
                                    <div className="is-widget-label">
                                        <h3 className="subtitle is-spaced">Empregados</h3>
                                        <h1 className="title">{totalEmpregados}</h1>
                                    </div>
                                </div>
                                <div className="level-item has-widget-icon">
                                    <div className="is-widget-icon">
                                        <span className="icon has-text-primary is-large" title="Total de Empregados último mês">
                                            <FontAwesomeIcon icon={faUsers} size="2x" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='column'>
                    <div className='card'>
                        <div className='card-content'>
                            <div className="level is-mobile">
                                <div className="level-item">
                                    <div className="is-widget-label">
                                        <h3 className="subtitle is-spaced">Demitidos</h3>
                                        <h1 className="title">{totalDemitidos}</h1>
                                    </div>
                                </div>
                                <div className="level-item has-widget-icon">
                                    <div className="is-widget-icon">
                                        <span className="icon has-text-danger is-large" title="Total de Demitidos">
                                            <FontAwesomeIcon icon={faUserSlash} size="2x" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='column'>
                    <div className='card'>
                        <div className='card-content'>
                            <div className="level is-mobile">
                                <div className="level-item">
                                    <div className="is-widget-label">
                                        <h3 className="subtitle is-spaced">Diesel Consumido</h3>
                                        <h1 className="title">{totalDiesel} L</h1>
                                    </div>
                                </div>
                                <div className="level-item has-widget-icon">
                                    <div className="is-widget-icon">
                                        <span className="icon has-text-warning is-large" title="Total de Diesel Consumido">
                                            <FontAwesomeIcon icon={faGasPump} size="2x" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='columns'>
                {rems.length === 0 ? (
                    <p>Nenhum dado disponível para exibição.</p>
                ) : (
                    <RemTable companyId={companyId} rems={rems} />
                )}
            </div>

    </Layout>
  );
};

export default RemCompany;
