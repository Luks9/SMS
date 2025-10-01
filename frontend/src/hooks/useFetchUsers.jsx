import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchUsers = () => {
  const { getToken } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');

  const fetchUsers = async (page = 1, search = searchTerm, type = userTypeFilter) => {
    const token = getToken();

    if (!token) {
      setError('Token de autenticação não disponível');
      setLoading(false);
      return;
    }

    const shouldShowSkeleton = page === 1 && users.length === 0;

    if (shouldShowSkeleton) {
      setLoading(true);
    } else {
      setPaginationLoading(true);
    }

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) {
        params.append('search', search);
      }
      if (type && type !== 'all') {
        params.append('user_type', type);
      }

      const response = await axios.get(`/api/users/list/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { results = [], count: totalCount = 0, next: nextPage = null, previous: previousPage = null } = response.data || {};

      setUsers(results);
      setCount(totalCount);
      setNext(nextPage);
      setPrevious(previousPage);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError('Erro ao buscar usuários. Tente novamente mais tarde.');
      if (page === 1) {
        setUsers([]);
        setCount(0);
        setNext(null);
        setPrevious(null);
      }
    } finally {
      if (page === 1) {
        setLoading(false);
      }
      setPaginationLoading(false);
    }
  };

  const fetchGroups = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      const response = await axios.get('/api/users/groups/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setGroups(response.data);
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
    }
  };

  const updateUser = async (userId, userData) => {
    const token = getToken();

    if (!token) {
      throw new Error('Token de autenticação não disponível');
    }

    try {
      const response = await axios.put(`/api/users/users/${userId}/update/`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, ...response.data } : user)));

      return response.data;
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      throw err;
    }
  };

  const manageUserGroups = async (userId, groupIds, action = 'set') => {
    const token = getToken();

    if (!token) {
      throw new Error('Token de autenticação não disponível');
    }

    try {
      const response = await axios.post(
        `/api/users/users/${userId}/groups/`,
        {
          group_ids: groupIds,
          action: action,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? response.data.user : user)));

      return response.data;
    } catch (err) {
      console.error('Erro ao gerenciar grupos do usuário:', err);
      throw err;
    }
  };

  const deleteUser = async (userId) => {
    const token = getToken();

    if (!token) {
      throw new Error('Token de autenticação não disponível');
    }

    try {
      await axios.delete(`/api/users/${userId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      throw err;
    }
  };

  const handleSearch = async (term = '') => {
    setSearchTerm(term);
    await fetchUsers(1, term, userTypeFilter);
  };

  const handleUserTypeFilter = async (type = 'all') => {
    setUserTypeFilter(type);
    await fetchUsers(1, searchTerm, type);
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUsers();
    fetchGroups();
  }, [getToken]);

  return {
    users,
    groups,
    count,
    next,
    previous,
    currentPage,
    loading,
    paginationLoading,
    error,
    fetchUsers,
    updateUser,
    manageUserGroups,
    deleteUser,
    searchTerm,
    handleSearch,
    userTypeFilter,
    handleUserTypeFilter,
  };
};

export default useFetchUsers;
