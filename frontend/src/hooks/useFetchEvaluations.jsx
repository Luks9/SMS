// src/hooks/useFetchEvaluations.jsx

import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluations = () => {
  const { getToken } = useContext(AuthContext);

  const currentMonth = new Date();
  const defaultPeriod = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  const [evaluations, setEvaluations] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState(defaultPeriod);

  const fetchEvaluations = async (page = 1, search = searchTerm, period = periodFilter) => {
    const token = getToken();

    if (!token) {
      setError('Token de autenticacao nao disponivel');
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) {
        params.append('search', search);
      }
      if (period) {
        const [yearPart, monthPart] = period.split('-');
        if (yearPart) {
          params.append('period_year', yearPart);
        }
        if (monthPart) {
          const monthNumber = parseInt(monthPart, 10);
          if (!Number.isNaN(monthNumber)) {
            params.append('period_month', String(monthNumber));
          }
        }
      }

      setPaginationLoading(true);
      const response = await axios.get(`/api/evaluation/?is_active=true&${params.toString()}`, {
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
        setError('Nenhuma avaliacao encontrada.');
      }
    } catch (err) {
      console.error('Erro ao buscar avaliacoes:', err);
      setError('Erro ao buscar avaliacoes. Tente novamente mais tarde.');
    } finally {
      setPaginationLoading(false);
      if (page === 1) {
        setLoading(false);
      }
    }
  };

  const handleSearch = async (term = '') => {
    setSearchTerm(term);
    await fetchEvaluations(1, term, periodFilter);
  };

  const handlePeriodFilter = async (value = '') => {
    setPeriodFilter(value);
    await fetchEvaluations(1, searchTerm, value);
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
    paginationLoading,
    error,
    fetchEvaluations,
    searchTerm,
    handleSearch,
    periodFilter,
    handlePeriodFilter,
  };
};

export default useFetchEvaluations;
