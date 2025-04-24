import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import Layout from '../../components/Layout';
import RemTabelaAvaliador from './RemTabelaAvaliador';
import RemCharts from './RemCharts';

const RemAvaliador = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useContext(AuthContext);

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
      <h1 className="title">Avaliação de REMs</h1>
      <RemCharts data={data} />
      <div className="columns">
        <RemTabelaAvaliador data={data} loading={loading} />
      </div>
    </Layout>
  );
};

export default RemAvaliador;