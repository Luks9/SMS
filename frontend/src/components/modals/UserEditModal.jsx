import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import useFetchCompany from '../../hooks/useFetchCompany';
import useFetchPolos from '../../hooks/useFetchPolos';

const UserEditModal = ({ user, groups, isOpen, onClose, onSave, onManageGroups, is_staff }) => {
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
  const { companies, loading: companiesLoading } = useFetchCompany();

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: company.name + (company.cnpj ? ` (${company.cnpj})` : '')
  }));

  
  const poloOptions = polos.map(polo => ({
    value: polo.id,
    label: polo.name
  }));

  useEffect(() => {
    if (user) {
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

      const userCompanies = user.companies || [];
      const companyIds = userCompanies.map(c => c.id);
      setSelectedCompanies(companyIds);
    }
  }, [user, groups, companies, polos]);

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
    const ids = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
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
      if (!formData.is_superuser && selectedCompanies.length > 0) {
        updateData.company_ids = selectedCompanies;
      }
      if (formData.is_staff && selectedPolos.length > 0) {
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
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Editar Usuário</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {error && (
            <div className="notification is-danger">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
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
              <div className="control">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  Ativo
                </label>
              </div>
            </div>

            <div className="field">
              <label className="label">Permissões</label>
              <div className="control">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="is_superuser"
                    checked={formData.is_superuser}
                    onChange={handleInputChange}
                  />
                  Avaliador
                </label>
              </div>
              <p className="help is-info">
                Avaliadores têm acesso completo ao sistema
              </p>
            </div>

            {!formData.is_superuser && (
              <div className="field">
                <label className="label">Empresas</label>
                <div className="control">
                  {companiesLoading ? (
                    <div className="notification is-info">Carregando empresas...</div>
                  ) : companies.length === 0 ? (
                    <div className="notification is-warning">Nenhuma empresa disponível</div>
                  ) : (
                    <Select
                      isMulti
                      options={companyOptions}
                      value={companyOptions.filter(opt => selectedCompanies.includes(opt.value))}
                      onChange={handleCompanySelectChange}
                      placeholder="Selecione uma ou mais empresas..."
                      closeMenuOnSelect={false}
                    />
                  )}
                </div>
                <p className="help is-info">
                  Selecione uma ou mais empresas que este usuário pode acessar
                </p>
              </div>
            )}

            <div className="field">
              <label className="label">Grupos</label>
              <div className="control">
                {groups.map(group => (
                  <div key={group.id} className="field">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.id)}
                        onChange={() => handleGroupChange(group.id)}
                      />
                      {group.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </section>
        <footer className="modal-card-foot">
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
