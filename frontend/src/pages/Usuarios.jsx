import React, { useState } from 'react';
import Layout from '../components/Layout';
import UserTable from '../components/tables/UserTable';
import UserEditModal from '../components/modals/UserEditModal';
import useFetchUsers from '../hooks/useFetchUsers';

const Usuarios = () => {
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
    fetchUsers,
    updateUser,
    manageUserGroups,
    deleteUser
  } = useFetchUsers();

  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUser = async (userId, userData) => {
    await updateUser(userId, userData);
  };

  const handleManageGroups = async (userId, groupIds, action) => {
    await manageUserGroups(userId, groupIds, action);
  };

  const handleDeleteUser = async (userId) => {
    await deleteUser(userId);
  };

  const handlePageChange = (page) => {
    fetchUsers(page);
  };

  const totalPages = Math.ceil(count / 10);

  return (
    <Layout>
      <div className="content">
        <h1 className="title">Administração de Usuários</h1>
        
        {error && (
          <div className="notification is-danger">
            {error}
          </div>
        )}

        <div className="card">
          <header className="card-header">
            <p className="card-header-title">
              Usuários ({count})
            </p>
          </header>
          <div className="card-content">
            <UserTable 
              users={users}
              groups={groups}
              loading={loading}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />

            {/* Paginação */}
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

        {/* Modal de Edição */}
        <UserEditModal 
          user={selectedUser}
          groups={groups}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          onManageGroups={handleManageGroups}
        />
      </div>
    </Layout>
  );
};

export default Usuarios;
