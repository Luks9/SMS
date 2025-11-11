import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchPlanActionDetails = (id) => {
  const { getToken } = useContext(AuthContext);

  const [actionPlan, setActionPlan] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as avaliações
  const fetchActionPlanDetails  = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/action-plans/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setActionPlan(response.data);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchActionPlanDetails();
    }
  }, [id]);

  return { actionPlan, loading, fetchActionPlanDetails };
};

export default useFetchPlanActionDetails;
