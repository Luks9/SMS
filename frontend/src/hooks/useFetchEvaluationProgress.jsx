// src/hooks/useFetchEvaluationProgress.jsx

import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchEvaluationProgress = (id) => {
    const { getToken } = useContext(AuthContext);

    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    // Função para buscar o progresso da avaliação
    const fetchEvaluationProgress = async () => {
        try {
            const token = getToken();
            const response = await axios.get(`/api/evaluation/${id}/progress/`, {
                headers: {
                Authorization: `Bearer ${token}`,
                },
            });
            setProgress(response.data);
        } catch (error) {
            console.error('Erro ao buscar o progresso da avaliação:', error);
        } finally {
            setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchEvaluationProgress();
    }
  }, [id]);

  return { progress, loading, fetchEvaluationProgress };
};

export default useFetchEvaluationProgress;
