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
  const { selectedPoleId } = useContext(AuthContext);
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
    fetchUsers,
    updateUser,
    manageUserGroups
  } = useFetchUsers();

  const {
    companies,
    users: companyUsers,
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
    deleteCompany
  } = useFetchCompanies();

  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
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
  };

  const handleSaveCompany = async (companyId, companyData) => {
    try {
      await updateCompany(companyId, companyData);
      handleCloseCompanyModal();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
    }
  };

  const handleManageGroups = async (userId, groupIds, action) => {
    await manageUserGroups(userId, groupIds, action);
  };

  const handleDeleteCompany = async (companyId) => {
    try {
      await deleteCompany(companyId);
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
    }
  };

  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  const handleCompanyPageChange = (page) => {
    fetchCompanies(page);
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleCreateCompanySubmit = async (companyData) => {
    try {
      await createCompany(companyData);
      handleCloseCompanyModal();
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    }
  };

  const totalPages = Math.ceil(count / 10);
  const companyTotalPages = Math.ceil(companyCount / 10);

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
              searchValue={searchTerm}
              onSearch={handleSearch}
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
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
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
                  {Array.from({ length: Math.min(companyTotalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
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
