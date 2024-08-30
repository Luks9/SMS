// src/hooks/useFetchForms.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchForms = () => {
  const { getToken } = useContext(AuthContext);

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar os formulários
  const fetchForms = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/forms/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setForms(response.data);
    } catch (error) {
      console.error('Erro ao buscar formulários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchForms();
  }, [getToken]);

  return { forms, loading, fetchForms };
};

export default useFetchForms;
