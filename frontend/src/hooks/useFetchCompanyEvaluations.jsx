import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompanyEvaluations = (companyId) => {
  const { getToken } = useContext(AuthContext);

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar as avaliações por empresa
  const fetchEvaluationsByCompany = async (companyId) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/evaluation/evaluations-by-company/${companyId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data && response.data.length > 0) {
        setEvaluations(response.data);
      } else {
        setEvaluations([]); // Caso não haja avaliações, retorna um array vazio
      }
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      fetchEvaluationsByCompany(companyId);
    }
  }, [companyId]); // Dispara quando o companyId mudar

  return { evaluations, loading, error };
};

export default useFetchCompanyEvaluations;
