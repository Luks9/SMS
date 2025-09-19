import React, { useState } from 'react';
import '../styles/CompanySelectionModal.css';

const CompanySelectionModal = ({ companies, onSelectCompany, onClose, user }) => {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleConfirm = () => {
    if (selectedCompany) {
      onSelectCompany(selectedCompany);
      onClose();
    }
  };

  const handleCompanyClick = (company) => {
    setSelectedCompany(company);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Selecionar Empresa</h2>
          <span className="welcome-text">
            Olá, <strong>{user?.name || user?.username}</strong>! 
            Você tem acesso a múltiplas empresas.
          </span>
        </div>
        
        <div className="modal-body">
          <p>Selecione a empresa que deseja acessar:</p>
          <div className="companies-list">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`company-item ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                onClick={() => handleCompanyClick(company)}
              >
                <div className="company-info">
                  <h3>{company.name}</h3>
                  {company.cnpj && (
                    <p className="company-cnpj">CNPJ: {company.cnpj}</p>
                  )}
                  {company.dominio && (
                    <p className="company-domain">Domínio: {company.dominio}</p>
                  )}
                </div>
                <div className="company-radio">
                  <input
                    type="radio"
                    name="company"
                    checked={selectedCompany?.id === company.id}
                    onChange={() => handleCompanyClick(company)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={!selectedCompany}
          >
            Confirmar Acesso
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelectionModal;
