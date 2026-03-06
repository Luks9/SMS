// src/hooks/useFetchCompany.jsx
import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompany = (onlyActive = null) => {
  const { getToken, selectedPoleId } = useContext(AuthContext);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as empresas
  const fetchCompanies = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        setCompanies([]);
        return;
      }

      const params = {};
      if (onlyActive !== undefined && onlyActive !== null) {
        params.is_active = onlyActive;
      }
      params._ts = Date.now();
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
  }, [getToken, onlyActive]);

  useEffect(() => {
    setLoading(true);
    fetchCompanies();
  }, [fetchCompanies, selectedPoleId]);

  return { companies, loading, fetchCompanies };
};

export default useFetchCompany;
