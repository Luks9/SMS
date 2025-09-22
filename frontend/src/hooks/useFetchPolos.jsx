import { useEffect, useState } from 'react';
import axios from 'axios';

const useFetchPolos = () => {
  const [polos, setPolos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/poles/all/')
      .then(res => setPolos(res.data))
      .catch(() => setPolos([]))
      .finally(() => setLoading(false));
  }, []);

  return { polos, loading };
};

export default useFetchPolos;