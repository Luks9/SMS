import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluation = (id) => {
  const { getToken } = useContext(AuthContext);

  const [evaluation, setEvaluation] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as avaliações
  const fetchEvaluations = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/evaluation/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setEvaluation(response.data);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
        setLoading(true);
        fetchEvaluations();
    }
  }, []);

  return { evaluation, loading, fetchEvaluations };
};

export default useFetchEvaluation;
