import React, { useMemo, useState, useEffect } from 'react';
import Select from 'react-select';
import useFetchCompany from '../../hooks/useFetchCompany';
import useFetchPolos from '../../hooks/useFetchPolos';
import '../../styles/UserEditModalSwitch.css';

const UserEditModal = ({
  user,
  groups,
  isOpen,
  selectedPoleId = null,
  selectedPoleName = '',
  companyRefreshKey = 0,
  onClose,
  onSave,
  onManageGroups,
  is_staff,
}) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
    username: '',
    is_superuser: false,
  });

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPolos, setSelectedPolos] = useState([]);
  
  const { polos, loading: polosLoading } = useFetchPolos();
  const { companies, loading: companiesLoading, fetchCompanies } = useFetchCompany();

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: company.name + (company.cnpj ? ` (${company.cnpj})` : '')
  }));

  
  const poloOptions = polos.map(polo => ({
    value: polo.id,
    label: polo.name
  }));

  const groupedLinksByPole = useMemo(() => {
    const groupsByPole = new Map();
    const userCompanies = user?.companies || [];

    userCompanies.forEach((company) => {
      const poles = company?.poles || [];
      if (!poles.length) {
        const key = 'sem-polo';
        if (!groupsByPole.has(key)) groupsByPole.set(key, { label: 'Sem polo', companies: [] });
        groupsByPole.get(key).companies.push(company.name);
        return;
      }

      poles.forEach((polo) => {
        const key = String(polo.id);
        if (!groupsByPole.has(key)) groupsByPole.set(key, { label: polo.name, companies: [] });
        groupsByPole.get(key).companies.push(company.name);
      });
    });

    return Array.from(groupsByPole.entries()).map(([key, value]) => ({
      id: key,
      label: value.label,
      companies: [...new Set(value.companies)].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }));
  }, [user?.companies]);

  const scopedUserCompanyIds = useMemo(() => {
    const userCompanies = user?.companies || [];
    if (!selectedPoleId) return userCompanies.map((c) => c.id);

    return userCompanies
      .filter((company) => (company?.poles || []).some((polo) => Number(polo.id) === Number(selectedPoleId)))
      .map((company) => company.id);
  }, [selectedPoleId, user?.companies]);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        is_active: user.is_active || false,
        is_superuser: user.is_superuser || false,
        username: user.username || '',
        is_staff: user.is_staff || false,
      });

      const userGroups = user.groups || [];
      const groupIds = userGroups
        .map(groupName => {
          const g = groups.find(g => g.name === groupName);
          return g ? g.id : null;
        })
        .filter(id => id != null);

      setSelectedGroups(groupIds);
      setSelectedPolos(user.polos ? user.polos.map(p => p.id) : []);

      setSelectedCompanies(scopedUserCompanyIds);
    }
  }, [groups, isOpen, scopedUserCompanyIds, user]);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [companyRefreshKey, fetchCompanies, isOpen]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'is_superuser' && checked) {
      setSelectedCompanies([]);
    }
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleCompanySelectChange = (selectedOptions) => {
    const ids = selectedOptions ? selectedOptions.map(opt => Number(opt.value)) : [];
    setSelectedCompanies(ids);
  };

  const handlePoloSelectChange = (selectedOptions) => {
    const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    setSelectedPolos(ids);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData = { ...formData };
      if (!formData.is_superuser) {
        updateData.company_ids = selectedCompanies;
        if (selectedPoleId) {
          updateData.active_polo_id = Number(selectedPoleId);
        }
      }
      if (formData.is_superuser) {
        updateData.polo_ids = selectedPolos;
      }

      await onSave(user.id, updateData);

      if (onManageGroups) {
        await onManageGroups(user.id, selectedGroups, 'set');
      }

      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError(err.response?.data?.detail || err.message || 'Erro ao salvar usuário');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card user-edit-modal-card">
        <header className="modal-card-head user-edit-modal-head">
          <p className="modal-card-title user-edit-modal-title">Editar Usuário</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body user-edit-modal-body">
          {error && (
            <div className="notification is-danger">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="user-edit-form">
            <div className="field">
              <label className="label">Nome de Usuário</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="user-edit-name-row">
              <div className="field">
                <label className="label">Nome</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Sobrenome</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label">Email</label>
              <div className="control">
                <input
                  className="input"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {is_staff && formData.is_superuser && (
            <div className="field">
              <label className="label">Polos</label>
              <div className="control">
                {polosLoading ? (
                  <div className="notification is-info">Carregando polos...</div>
                ) : polos.length === 0 ? (
                  <div className="notification is-warning">Nenhum polo disponível</div>
                ) : (
                  <Select
                    isMulti
                    options={poloOptions}
                    value={poloOptions.filter(opt => selectedPolos.includes(opt.value))}
                    onChange={handlePoloSelectChange}
                    placeholder="Selecione um ou mais polos..."
                    closeMenuOnSelect={false}

                  />
                )}
              </div>
              <p className="help is-info">
                Selecione os polos que este usuário pode gerenciar
              </p>
            </div>
          )}

            <div className="field">
              <label className="label">Status</label>
              <div className="control switch-row">
                <label className="toggle-switch" htmlFor="user-active-switch">
                  <input
                    id="user-active-switch"
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <span className="slider" aria-hidden="true"></span>
                  <span className="switch-label">{formData.is_active ? 'Ativo' : 'Inativo'}</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label className="label">Permissões</label>
              <div className="control switch-row">
                <label className="toggle-switch" htmlFor="user-superuser-switch">
                  <input
                    id="user-superuser-switch"
                    type="checkbox"
                    name="is_superuser"
                    checked={formData.is_superuser}
                    onChange={handleInputChange}
                  />
                  <span className="slider" aria-hidden="true"></span>
                  <span className="switch-label">{formData.is_superuser ? 'Avaliador' : 'Empresa'}</span>
                </label>
              </div>
              <p className="help is-info">
                Avaliadores têm acesso completo ao sistema
              </p>
            </div>

            {!formData.is_superuser && (
              <div className="notification is-info is-light">
                <strong>Você está editando os vínculos do polo {selectedPoleName || 'ativo'}.</strong>
                <br />
                Alterações realizadas aqui não afetam outros polos.
              </div>
            )}

            {!formData.is_superuser && groupedLinksByPole.length > 0 && (
              <div className="field">
                <label className="label">Vínculos atuais por polo</label>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {groupedLinksByPole.map((item) => (
                    <div key={item.id} className="box" style={{ padding: '0.65rem' }}>
                      <p className="has-text-weight-semibold" style={{ marginBottom: '0.35rem' }}>{item.label}</p>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {item.companies.map((companyName) => (
                          <span key={`${item.id}-${companyName}`} className="tag is-light is-link">
                            {companyName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!formData.is_superuser && (
              <div className="field">
                <label className="label">Empresas do polo em edição</label>
                <div className="control">
                  {companiesLoading ? (
                    <div className="notification is-info">Carregando empresas...</div>
                  ) : companies.length === 0 ? (
                    <div className="notification is-warning">Nenhuma empresa disponível</div>
                  ) : (
                    <Select
                      isMulti
                      options={companyOptions}
                      value={companyOptions.filter(opt => selectedCompanies.includes(Number(opt.value)))}
                      onChange={handleCompanySelectChange}
                      placeholder="Selecione uma ou mais empresas..."
                      closeMenuOnSelect={false}
                    />
                  )}
                </div>
                <p className="help is-info">
                  Selecione empresas apenas deste polo. Outros polos permanecem inalterados.
                </p>
              </div>
            )}

            <div className="field">
              <label className="label">Grupos</label>
              <div className="control group-switches">
                {groups.map(group => (
                  <div key={group.id} className="switch-row">
                    <label className="toggle-switch" htmlFor={`user-group-switch-${group.id}`}>
                      <input
                        id={`user-group-switch-${group.id}`}
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupChange(group.id)}
                      />
                      <span className="slider" aria-hidden="true"></span>
                      <span className="switch-label">{group.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </section>
        <footer className="modal-card-foot modal-actions">
          <button
            className={`button is-success ${loading ? 'is-loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            Salvar
          </button>
          <button className="button" onClick={onClose}>Cancelar</button>
        </footer>
      </div>
    </div>
  );
};

export default UserEditModal;
