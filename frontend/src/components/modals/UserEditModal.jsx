import React, { useState, useEffect } from 'react';

const UserEditModal = ({ user, groups, isOpen, onClose, onSave, onManageGroups }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    is_active: true,
    username: ''
  });

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        is_active: user.is_active || false,
        username: user.username || ''
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
      // Atualizar dados do usuário
      await onSave(user.id, formData);
      
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
