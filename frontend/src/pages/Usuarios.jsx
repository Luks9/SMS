import React, { useState, useContext, useEffect } from 'react';
import Layout from '../components/Layout';
import UserTable from '../components/tables/UserTable';
import CompanyTable from '../components/tables/CompanyTable';
import UserEditModal from '../components/modals/UserEditModal';
import CompanyEditModal from '../components/modals/CompanyEditModal';
import useFetchUsers from '../hooks/useFetchUsers';
import useFetchCompanies from '../hooks/useFetchCompanies';
import { AuthContext } from '../context/AuthContext';


const Usuarios = () => {
  const { selectedPoleId, selectedPole } = useContext(AuthContext);
  const { 
    users, 
    groups, 
    count, 
    next, 
    previous, 
    currentPage, 
    loading, 
    paginationLoading, 
    error,
    searchTerm,
    handleSearch,
    userTypeFilter,
    handleUserTypeFilter,
    fetchUsers,
    updateUser,
    manageUserGroups
  } = useFetchUsers();

  const {
    companies,
    count: companyCount,
    next: companyNext,
    previous: companyPrevious,
    currentPage: companyCurrentPage,
    loading: companyLoading,
    paginationLoading: companyPaginationLoading,
    error: companyError,
    fetchCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    searchTerm: companySearchTerm,
    handleSearch: handleCompanySearch
  } = useFetchCompanies();

  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyRefreshKey, setCompanyRefreshKey] = useState(0);
  const is_staff = localStorage.getItem('is_staff') === 'true';

  useEffect(() => {
    fetchCompanies();
  }, [selectedPoleId]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    setIsCompanyModalOpen(true);
  };

  const handleCloseCompanyModal = () => {
    setIsCompanyModalOpen(false);
    setSelectedCompany(null);
  };

  const handleSaveUser = async (userId, userData) => {
    await updateUser(userId, userData);
    await fetchUsers(currentPage, searchTerm, userTypeFilter);
  };

  const handleSaveCompany = async (companyId, companyData) => {
    try {
      await updateCompany(companyId, companyData);
      setCompanyRefreshKey((prev) => prev + 1);
      handleCloseCompanyModal();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    }
  };

  const handleManageGroups = async (userId, groupIds, action) => {
    await manageUserGroups(userId, groupIds, action);
    await fetchUsers(currentPage, searchTerm, userTypeFilter);
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      await deleteCompany(companyId);
      setCompanyRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
    }
  };

  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  const handleCompanyPageChange = (page) => {
    fetchCompanies(page, companySearchTerm);
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleCreateCompanySubmit = async (companyData) => {
    try {
      await createCompany(companyData);
      setCompanyRefreshKey((prev) => prev + 1);
      handleCloseCompanyModal();
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    }
  };

  const totalPages = Math.ceil(count / 10);
  const companyTotalPages = Math.ceil(companyCount / 10);
  const buildPageWindow = (current, total, size = 5) => {
    const windowSize = Math.min(size, total);
    const start = Math.max(1, Math.min(current - Math.floor(windowSize / 2), total - windowSize + 1));
    return Array.from({ length: windowSize }, (_, i) => start + i);
  };

  return (
    <Layout>
      <div className="content">
        <h1 className="title">Administração de Usuários</h1>
        
        {error && (
          <div className="notification is-danger">
            {error}
          </div>
        )}

        {/* Tabela de Usuários */}
        <div className="card">
          <header className="card-header">
            <p className="card-header-title">
              Usuários ({count})
            </p>
          </header>
          <div className="card-content">
            <UserTable
              users={users}
              loading={loading}
              onEdit={handleEditUser}
              paginationLoading={paginationLoading}
              selectedPoleId={selectedPoleId}
              searchValue={searchTerm}
              onSearch={handleSearch}
              filterValue={userTypeFilter}
              onFilterChange={handleUserTypeFilter}
              searchPlaceholder="Buscar por nome, email, empresa, polo, perfil ou status..."
            />

            {/* Paginação de Usuários */}
            {totalPages > 1 && (
              <nav className="pagination is-centered" role="navigation">
                <button 
                  className={`pagination-previous ${!previous ? 'is-disabled' : ''} ${paginationLoading ? 'is-loading' : ''}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!previous || paginationLoading}
                >
                  Anterior
                </button>
                <button 
                  className={`pagination-next ${!next ? 'is-disabled' : ''} ${paginationLoading ? 'is-loading' : ''}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!next || paginationLoading}
                >
                  Próximo
                </button>
                <ul className="pagination-list">
                  {buildPageWindow(currentPage, totalPages).map((pageNum) => {
                    return (
                      <li key={pageNum}>
                        <button 
                          className={`pagination-link ${currentPage === pageNum ? 'is-current' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                          disabled={paginationLoading}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>
        </div>

        {/* Tabela de Empresas */}
        <div className="card" style={{ marginTop: '2rem' }}>
          <header className="card-header">
            <p className="card-header-title">
              Empresas ({companyCount})
            </p>
            <div className="card-header-icon">
              <button 
                className="button is-success"
                onClick={handleCreateCompany}
              >
                Nova Empresa
              </button>
            </div>
          </header>
          <div className="card-content">
            {companyError && (
              <div className="notification is-danger">
                {companyError}
              </div>
            )}

            <CompanyTable
              companies={companies}
              loading={companyLoading}
              onEdit={handleEditCompany}
              onDelete={handleDeleteCompany}
              paginationLoading={companyPaginationLoading}
              searchValue={companySearchTerm}
              onSearch={handleCompanySearch}
            />

            {/* Paginação de Empresas */}
            {companyTotalPages > 1 && (
              <nav className="pagination is-centered" role="navigation">
                <button 
                  className={`pagination-previous ${!companyPrevious ? 'is-disabled' : ''} ${companyPaginationLoading ? 'is-loading' : ''}`}
                  onClick={() => handleCompanyPageChange(companyCurrentPage - 1)}
                  disabled={!companyPrevious || companyPaginationLoading}
                >
                  Anterior
                </button>
                <button 
                  className={`pagination-next ${!companyNext ? 'is-disabled' : ''} ${companyPaginationLoading ? 'is-loading' : ''}`}
                  onClick={() => handleCompanyPageChange(companyCurrentPage + 1)}
                  disabled={!companyNext || companyPaginationLoading}
                >
                  Próximo
                </button>
                <ul className="pagination-list">
                  {buildPageWindow(companyCurrentPage, companyTotalPages).map((pageNum) => {
                    return (
                      <li key={pageNum}>
                        <button 
                          className={`pagination-link ${companyCurrentPage === pageNum ? 'is-current' : ''}`}
                          onClick={() => handleCompanyPageChange(pageNum)}
                          disabled={companyPaginationLoading}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>
        </div>

        {/* Modal de Edição de Usuário */}
        <UserEditModal 
          user={selectedUser}
          groups={groups}
          isOpen={isUserModalOpen}
          selectedPoleId={selectedPoleId}
          selectedPoleName={selectedPole?.name || ''}
          companyRefreshKey={companyRefreshKey}
          onClose={handleCloseUserModal}
          onSave={handleSaveUser}
          onManageGroups={handleManageGroups}
          is_staff={is_staff}
        />

        {/* Modal de Edição de Empresa */}
        <CompanyEditModal 
          company={selectedCompany}
          isOpen={isCompanyModalOpen}
          onClose={handleCloseCompanyModal}
          onSave={handleSaveCompany}
          onCreate={handleCreateCompanySubmit}
        />
      </div>
    </Layout>
  );
};

export default Usuarios;
