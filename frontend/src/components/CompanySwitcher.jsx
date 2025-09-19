import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import CompanySelectionModal from './CompanySelectionModal';

const CompanySwitcher = () => {
  const { user, selectedCompany, switchCompany } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);

  if (!user || user.is_superuser || !user.companies || user.companies.length <= 1) {
    return null;
  }

  const handleSwitchCompany = (company) => {
    switchCompany(company);
    setShowModal(false);
  };

  return (
    <>
      <div className="company-switcher">
        <div className="current-company">
          <strong>Empresa Atual:</strong> {selectedCompany?.name || 'Nenhuma selecionada'}
        </div>
        {user.companies.length > 1 && (
          <button
            className="btn-switch-company"
            onClick={() => setShowModal(true)}
          >
            Trocar Empresa
          </button>
        )}
      </div>

      {showModal && (
        <CompanySelectionModal
          companies={user.companies}
          user={user}
          onSelectCompany={handleSwitchCompany}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default CompanySwitcher;
