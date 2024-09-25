// src/hooks/useFetchCompanyQuestions.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompanyQuestions = (id) => {
  const { getToken } = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar as perguntas da avaliação
  const fetchQuestions = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/evaluation/${id}/questions-with-answers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setQuestions(response.data.questions);
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
  }, [id]);

  return { questions, loading, error, fetchQuestions };
};

export default useFetchCompanyQuestions;
