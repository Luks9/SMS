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

  const fetchUsers = async (page = 1) => {
    const token = getToken();

    if (!token) {
      setError('Token de autenticação não disponível');
      setLoading(false);
      return;
    }

    try {
      setPaginationLoading(true);
      const response = await axios.get(`/api/users/list/?page=${page}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data.results) {
        setUsers(response.data.results);
        setCount(response.data.count);
        setNext(response.data.next);
        setPrevious(response.data.previous);
        setCurrentPage(page);
      } else {
        setError('Nenhum usuário encontrado.');
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError('Erro ao buscar usuários. Tente novamente mais tarde.');
    } finally {
      setPaginationLoading(false);
      if (page === 1) {
        setLoading(false);
      }
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

      // Atualiza o usuário na lista local
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? { ...user, ...response.data } : user
      ));

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
      const response = await axios.post(`/api/users/users/${userId}/groups/`, {
        group_ids: groupIds,
        action: action
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Atualiza o usuário na lista local com os dados retornados
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId ? response.data.user : user
      ));

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

      // Remove o usuário da lista local
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
      throw err;
    }
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
    deleteUser
  };
};

export default useFetchUsers;
