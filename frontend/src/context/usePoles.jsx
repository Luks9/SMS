import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import axios from 'axios';

const usePoleContext = ({ initialPoleId = null }) => {
  const [poles, setPoles] = useState([]);
  const [selectedPoleId, setSelectedPoleId] = useState(() => {
    const storedId = localStorage.getItem('selectedPoleId');
    return storedId ? Number(storedId) : initialPoleId;
  });

  const userRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    const storedPole = localStorage.getItem('selectedPoleId');
    if (storedPole) {
      axios.defaults.headers.common['X-Polo-Id'] = Number(storedPole);
    }
  }, []);

  const setActivePole = useCallback((poleId) => {
    if (!poleId) {
      setSelectedPoleId(null);
      localStorage.removeItem('selectedPoleId');
      delete axios.defaults.headers.common['X-Polo-Id'];
      return;
    }

    const normalizedId = Number(poleId);
    setSelectedPoleId(normalizedId);
    localStorage.setItem('selectedPoleId', String(normalizedId));
    axios.defaults.headers.common['X-Polo-Id'] = normalizedId;
  }, []);

  const loadUserPoles = useCallback(
    async (authToken, authUser) => {
      const effectiveUser = authUser ?? userRef.current;

      if (!effectiveUser?.is_superuser) {
        setPoles([]);
        setActivePole(null);
        return;
      }

      const bearer =
        authToken ?? tokenRef.current ?? localStorage.getItem('token');

      if (!bearer) return;

      try {
        const { data } = await axios.get('/api/poles/my-poles/', {
          headers: { Authorization: `Bearer ${bearer}` },
        });

        setPoles(data);

        if (!data.length) {
          setActivePole(null);
          return;
        }

        const stored = localStorage.getItem('selectedPoleId');
        const storedId = stored ? Number(stored) : null;
        const nextId =
          storedId && data.some((pole) => pole.id === storedId)
            ? storedId
            : data[0].id;

        setActivePole(nextId);
      } catch (error) {
        console.error('Erro ao carregar polos do usuário:', error);
        setPoles([]);
        setActivePole(null);
      }
    },
    [setActivePole]
  );

  const selectedPole = useMemo(
    () => poles.find((pole) => pole.id === selectedPoleId) || null,
    [poles, selectedPoleId]
  );

  return {
    poles,
    setPoles,
    selectedPole,
    selectedPoleId,
    setActivePole,
    loadUserPoles,
    userRef,
    tokenRef,
  };
};

export default usePoleContext;
