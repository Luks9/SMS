// src/hooks/useFetchCompany.jsx
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompany = (onlyActive = null) => {
  const { getToken, selectedPoleId } = useContext(AuthContext);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as empresas
  const fetchCompanies = async () => {
    try {
      const token = getToken();

      const params = {};
      if (onlyActive !== undefined && onlyActive !== null) {
        params.is_active = onlyActive;
      }
      const response = await axios.get('/api/companies/all/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
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
  }, [selectedPoleId]);

  return { companies, loading, fetchCompanies };
};

export default useFetchCompany;
