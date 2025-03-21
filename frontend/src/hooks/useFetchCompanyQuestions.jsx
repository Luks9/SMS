import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompanyQuestions = (id) => {
  const { getToken } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [valid_until, SetValidUntil] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para validar o ID
  const isValidId = (id) => {
    return id && !isNaN(id) && Number(id) > 0; // Verifica se o id é um número válido e positivo
  };

  // Função para buscar as perguntas da avaliação
  const fetchQuestions = async () => {
    if (!isValidId(id)) {
      setError('ID inválido.');
      setLoading(false);
      return;
    }

    try {
      const token = getToken();
      const response = await axios.get(`/api/evaluation/${id}/questions-with-answers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Verifica se os dados retornados são válidos
      if (response.data && response.data.questions) {
        setQuestions(response.data.questions);
        SetValidUntil(response.data.valid_until);
      } else {
        setError('Não foi possível carregar as perguntas.');
      }
    } catch (err) {
      console.error('Erro ao carregar as perguntas:', err);
      setError('Erro ao carregar perguntas da avaliação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchQuestions();
    }
  }, [id]); // Apenas refaz a requisição se o id mudar

  return { questions, loading, error, valid_until, fetchQuestions };
};

export default useFetchCompanyQuestions;
