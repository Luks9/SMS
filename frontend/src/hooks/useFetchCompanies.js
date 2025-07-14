import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompanies = () => {
    const { getToken } = useContext(AuthContext);
    const token = getToken();
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [count, setCount] = useState(0);
    const [next, setNext] = useState(null);
    const [previous, setPrevious] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [paginationLoading, setPaginationLoading] = useState(false);
    const [error, setError] = useState(null);

  const fetchCompanies = async (page = 1) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setPaginationLoading(true);
      }
      
      const response = await axios.get(`/api/companies/?page=${page}`,{
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setCompanies(response.data.results);
      setCount(response.data.count);
      setNext(response.data.next);
      setPrevious(response.data.previous);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar empresas');
      console.error(err);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data.results || response.data);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const createCompany = async (companyData) => {
    try {
      await axios.post('/api/companies/', companyData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchCompanies(currentPage);
      setError(null);
    } catch (err) {
      setError('Erro ao criar empresa');
      console.error(err);
      throw err;
    }
  };

  const updateCompany = async (companyId, companyData) => {
    try {
      await axios.put(`/api/companies/${companyId}/`, companyData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchCompanies(currentPage);
      setError(null);
    } catch (err) {
      setError('Erro ao atualizar empresa');
      console.error(err);
      throw err;
    }
  };

  const deleteCompany = async (companyId) => {
    try {
      await axios.delete(`/api/companies/${companyId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchCompanies(currentPage);
      setError(null);
    } catch (err) {
      setError('Erro ao deletar empresa');
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUsers();
  }, []);

  return {
    companies,
    users,
    count,
    next,
    previous,
    currentPage,
    loading,
    paginationLoading,
    error,
    fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany
  };
};

export default useFetchCompanies;
