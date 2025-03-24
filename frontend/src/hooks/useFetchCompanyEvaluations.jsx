import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useFetchCompanyEvaluations = (companyId, is_active) => {
  const { getToken } = useContext(AuthContext);

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log(is_active);
  // Função para validar o companyId
  const isValidCompanyId = (companyId) => {
    return companyId && !isNaN(companyId) && Number(companyId) > 0; // Valida que é um número positivo
  };

  // Função para validar o parâmetro is_active
  const isValidIsActive = (is_active) => {
    return is_active === 'true' || is_active === 'false' || is_active === true || is_active === false;
  };

  // Função para buscar as avaliações por empresa
  const fetchEvaluationsByCompany = async (companyId) => {
    try {
      // Valida o companyId e is_active antes de fazer a requisição
      if (!isValidCompanyId(companyId)) {
        throw new Error('ID da empresa inválido');
      }

      if (!isValidIsActive(is_active)) {
        console.log(is_active);
        throw new Error('Valor de "is_active" inválido');
      }

      const token = getToken();
      const response = await axios.get(`/api/evaluation/evaluations-by-company/${companyId}/?is_active=${is_active}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.length > 0) {
        setEvaluations(response.data);
      } else {
        setEvaluations([]); // Caso não haja avaliações, retorna um array vazio
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
      fetchEvaluationsByCompany(companyId);
    }
  }, [companyId, is_active]); // Adicionando 'is_active' na dependência

  return { evaluations, loading, error };
};

export default useFetchCompanyEvaluations;
