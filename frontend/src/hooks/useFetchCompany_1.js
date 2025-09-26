import { useState, useEffect } from 'react';
import axios from 'axios';

const useFetchCompany = (onlyActive = true) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/companies/all/');
        
        setCompanies(response.data || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError(err);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return { companies, loading, error };
};

export default useFetchCompany;
