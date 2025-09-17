// src/hooks/useFetchCompany.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompany = () => {
  const { getToken } = useContext(AuthContext);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as empresas
  const fetchCompanies = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/companies/all/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCompanies(response.data);
    } catch (error) {
      console.error('Erro ao buscar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchCompanies();
  }, []);

  return { companies, loading, fetchCompanies };
};

export default useFetchCompany;
