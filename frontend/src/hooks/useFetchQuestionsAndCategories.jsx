// src/hooks/useFetchQuestionsAndCategories.js
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchQuestionsAndCategories = () => {
  const { getToken } = useContext(AuthContext);
  
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as perguntas
  const fetchQuestions = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/questions/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setQuestions(response.data);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar as categorias
  const fetchCategories = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/categories/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCategories();
    fetchQuestions();
  }, [getToken]);

  return { categories, questions, loading, fetchQuestions };
};

export default useFetchQuestionsAndCategories;
