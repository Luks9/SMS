import React, { useState, useEffect } from 'react';

const CompanyEditModal = ({ company, users, isOpen, onClose, onSave, onCreate }) => {
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    dominio: '',
    is_active: true,
    user: null
  });

  const isEditMode = Boolean(company);

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      dominio: '',
      is_active: true,
      user: null
    });
  };

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        cnpj: company.cnpj || '',
        dominio: company.dominio || '',
        is_active: company.is_active,
        user: company.user?.id || null
      });
    } else {
      resetForm();
    }
  }, [company, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await onSave(company.id, formData);
      } else {
        await onCreate(formData);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={handleClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">
            {isEditMode ? 'Editar Empresa' : 'Criar Nova Empresa'}
          </p>
          <button className="delete" onClick={handleClose}></button>
        </header>
        <section className="modal-card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Nome</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">CNPJ</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="label">Domínio</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  name="dominio"
                  value={formData.dominio}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="field">
              <label className="label">Usuário</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    name="user"
                    value={formData.user || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecionar usuário</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="control">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  &nbsp;Ativo
                </label>
              </div>
            </div>

            <div className="field is-grouped">
              <div className="control">
                <button className="button is-success" type="submit">
                  {isEditMode ? 'Salvar' : 'Criar'}
                </button>
              </div>
              <div className="control">
                <button className="button" type="button" onClick={handleClose}>
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default CompanyEditModal;
