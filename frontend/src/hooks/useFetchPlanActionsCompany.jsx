import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchPlanActionsCompany = (companyId) => {
  const { getToken } = useContext(AuthContext);

  const [actionsPlans, setActionsPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar as avaliações por empresa
  const FetchPlanActionsCompany = async (companyId) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/action-plans/${companyId}/by-company/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.data && response.data.length > 0) {
        setActionsPlans(response.data);
      } else {
        setActionsPlans([]); // Caso não haja avaliações, retorna um array vazio
      }
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      setLoading(true);
      FetchPlanActionsCompany(companyId);
    }
  }, [companyId]); // Dispara quando o companyId mudar

  return { actionsPlans, loading, error };
};

export default useFetchPlanActionsCompany;
