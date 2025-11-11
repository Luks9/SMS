import React, { useState, useEffect } from 'react';

const CompanyEditModal = ({ company, isOpen, onClose, onSave, onCreate }) => {
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

  const formatCNPJ = (value) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/[^0-9]/g, '');
    
    // Limita a 14 dígitos
    const limitedNumbers = numbers.slice(0, 14);
    
    // Aplica a formatação XX.XXX.XXX/XXXX-XX
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 5) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
    if (limitedNumbers.length <= 8) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
    if (limitedNumbers.length <= 12) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12)}`;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'cnpj') {
      const formattedCNPJ = formatCNPJ(value);
      setFormData(prev => ({
        ...prev,
        [name]: formattedCNPJ
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
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
                  placeholder="00.000.000/0000-00"
                  maxLength="18"
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
                  placeholder="ex: empresa.com.br"
                />
              </div>
              <p className="help is-info">
                Informe apenas o texto que vem <strong>após o "@"</strong> do e-mail corporativo.  
                <br />Exemplo: se o e-mail for <em>usuario@empresa.com.br</em>, o domínio é <code>empresa.com.br</code>.
              </p>
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
