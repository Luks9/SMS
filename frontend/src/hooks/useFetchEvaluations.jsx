// src/hooks/useFetchEvaluations.jsx

import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluations = () => {
  const { getToken } = useContext(AuthContext);

  const [evaluations, setEvaluations] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true); // Carregamento inicial
  const [paginationLoading, setPaginationLoading] = useState(false); // Carregamento da paginação
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEvaluations = async (page = 1) => {
    const token = getToken();

    if (!token) {
      setError('Token de autenticação não disponível');
      setLoading(false);
      return;
    }

    try {
      setPaginationLoading(true); // Inicia o carregamento da paginação
      const response = await axios.get(`/api/evaluation/?is_active=true&page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.results) {
        setEvaluations(response.data.results);
        setCount(response.data.count);
        setNext(response.data.next);
        setPrevious(response.data.previous);
        setCurrentPage(page);
      } else {
        setError('Nenhuma avaliação encontrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err);
      setError('Erro ao buscar avaliações. Tente novamente mais tarde.');
    } finally {
      setPaginationLoading(false); // Finaliza o carregamento da paginação
      if (page === 1) {
        setLoading(false); // Finaliza o carregamento inicial apenas na primeira página
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchEvaluations();
  }, [getToken]);

  return { 
    evaluations, 
    count, 
    next, 
    previous, 
    currentPage, 
    loading, 
    paginationLoading, // Expor o estado de carregamento da paginação
    error, 
    fetchEvaluations 
  };
};

export default useFetchEvaluations;