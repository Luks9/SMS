import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluations = () => {
  const { getToken } = useContext(AuthContext);

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar as avaliações
  const fetchEvaluations = async () => {
    const token = getToken();

    // Verifica se o token é válido
    if (!token) {
      setError('Token de autenticação não disponível');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get('/api/evaluation/?is_active=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Verifica se a resposta contém avaliações
      if (response.data) {
        setEvaluations(response.data);
      } else {
        setError('Nenhuma avaliação encontrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
      setError('Erro ao buscar avaliações. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);  // Limpa o erro antes de tentar buscar novamente
    fetchEvaluations();
  }, [getToken]); // Executa a requisição quando o token mudar

  return { evaluations, loading, error, fetchEvaluations };
};

export default useFetchEvaluations;
