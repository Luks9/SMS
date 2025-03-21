import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluation = (id) => {
  const { getToken } = useContext(AuthContext);

  const [evaluation, setEvaluation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para validar o ID
  const isValidId = (id) => {
    return id && !isNaN(id) && Number(id) > 0; // Verifica se o id é um número válido e positivo
  };

  // Função para buscar as avaliações
  const fetchEvaluations = async () => {
    if (!isValidId(id)) {
      setError('ID inválido.');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      const response = await axios.get(`/api/evaluation/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        setEvaluation(response.data);
      } else {
        setError('Avaliação não encontrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
      setError('Erro ao buscar avaliações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);  // Limpa o erro antes de tentar a nova requisição
      fetchEvaluations();
    }
  }, [id]); // A requisição agora será refeita sempre que o id mudar

  return { evaluation, loading, error, fetchEvaluations };
};

export default useFetchEvaluation;
