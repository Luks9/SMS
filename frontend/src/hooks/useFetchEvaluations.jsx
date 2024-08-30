import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluations = () => {
  const { getToken } = useContext(AuthContext);

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as avaliações
  const fetchEvaluations = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/evaluation/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response)
      setEvaluations(response.data);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchEvaluations();
  }, []);

  return { evaluations, loading, fetchEvaluations };
};

export default useFetchEvaluations;
