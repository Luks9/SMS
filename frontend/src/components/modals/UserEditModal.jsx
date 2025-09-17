import React, { useState, useEffect } from 'react';
import useFetchCompany from '../../hooks/useFetchCompany';

const UserEditModal = ({ user, groups, isOpen, onClose, onSave, onManageGroups }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
    username: '',
    company_id: ''
  });

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch companies for selection
  const { companies, loading: companiesLoading } = useFetchCompany();

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        is_active: user.is_active || false,
        is_superuser: user.is_superuser || false,
        username: user.username || '',
        company_id: user.company?.id || ''
      });
      
      // Extrair nomes dos grupos do usuário e encontrar os IDs correspondentes
      const userGroups = user.groups || [];
      const groupIds = [];
      
      userGroups.forEach(groupName => {
        const group = groups.find(g => g.name === groupName);
        if (group) {
          groupIds.push(group.id);
        }
      });
      
      setSelectedGroups(groupIds);
    }
  }, [user, groups]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {     
      // Include company_id in the form data
      const updateData = { ...formData };
      if (!formData.is_superuser && formData.company_id) {
        updateData.company_id = formData.company_id;
      }
      
      // Atualizar dados do usuário
      await onSave(user.id, updateData);
      
      // Gerenciar grupos do usuário
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
                    onChange={(e) => {
                      handleInputChange(e);
                      // Clear company selection when becoming superuser
                      if (e.target.checked) {
                        setFormData(prev => ({ ...prev, company_id: '' }));
                      }
                    }}
                  />
                  Avaliador
                </label>
              </div>
              <p className="help is-info">
                Avaliadores têm acesso completo ao sistema
              </p>
            </div>

            {/* Company selection - only for non-superusers */}
            {!formData.is_superuser && (
              <div className="field">
                <label className="label">Empresa</label>
                <div className="control">
                  <div className={`select is-fullwidth ${companiesLoading ? 'is-loading' : ''}`}>
                    <select
                      name="company_id"
                      value={formData.company_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Selecione uma empresa</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
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
