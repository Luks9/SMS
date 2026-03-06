import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faCheck, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import TableSearchInput from '../inputs/TableSearchInput';
import '../../styles/UserTableChips.css';
import CompanyCell from './company-cell/CompanyCell';
import { mapUserCompanyData } from '../../utils/companyContext';

const UserTable = ({
  users,
  loading,
  onEdit,
  paginationLoading,
  selectedPoleId = null,
  searchValue = '',
  onSearch,
  searchPlaceholder = 'Buscar usuario...',
  filterValue = 'all',
  onFilterChange = () => {},
}) => {
  const showEmptyState = !loading && users.length === 0;
  const disableSearch = loading || paginationLoading;

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.username || a.email || '';
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.username || b.email || '';
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    }),
    [users]
  );

  const companyDataByUserId = useMemo(() => {
    const map = new Map();
    sortedUsers.forEach((user) => {
      map.set(user.id, mapUserCompanyData(user, selectedPoleId));
    });
    return map;
  }, [selectedPoleId, sortedUsers]);

  const getDisplayName = (user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (fullName) return fullName;
    if (user.username) return user.username;
    return user.email || '-';
  };

  const getCompanyAbbreviation = (name) => {
    const normalized = (name || '').trim();
    if (!normalized) return '';
    const parts = normalized.split(' ').filter(Boolean);
    if (parts.length <= 1) return normalized.slice(0, 4).toUpperCase();
    return parts.slice(0, 3).map((part) => part[0].toUpperCase()).join('');
  };

  const renderPoleSummary = (user) => {
    const poleNames = (user.polos || []).map((pole) => pole?.name).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const companyAbbrs = (user.companies || [])
      .map((company) => company?.name)
      .filter(Boolean)
      .map((name) => getCompanyAbbreviation(name))
      .filter(Boolean);

    if (!poleNames.length) {
      return <span className="tag is-light">Sem polo</span>;
    }

    const [firstPole, ...otherPoles] = poleNames;
    const tooltip = `Polo principal: ${firstPole}`;
    const companyTooltip = companyAbbrs.join(', ');
    const otherPolesTooltip = otherPoles.length
      ? `Outros polos vinculados: ${otherPoles.join(', ')}`
      : 'Sem outros polos vinculados';

    return (
      <div className="entity-chip-group" title={tooltip}>
        {companyAbbrs.length > 0 && (
          <span className="tag is-dark is-light entity-chip-abbr" title={`Empresa(s): ${companyTooltip}`}>
            {companyAbbrs[0]}
          </span>
        )}
        <span className="tag is-link is-light entity-chip-main" title={`Polo principal: ${firstPole}`}>{firstPole}</span>
        {otherPoles.length > 0 && (
          <span className="tag is-info is-light entity-chip-extra" title={otherPolesTooltip}>
            +{otherPoles.length}
          </span>
        )}
      </div>
    );
  };

  const getRoleLabel = (user) => {
    if (user.is_superuser) return 'Avaliador';
    const groupNames = (user.groups || []).filter(Boolean);
    return groupNames.length ? groupNames.sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ') : 'Empresa';
  };

  return (
    <div>
      <div
        className="mb-4"
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: '160px' }}>
          <div className="select is-fullwidth is-small">
            <select
              id="user-type-filter"
              value={filterValue}
              onChange={(event) => onFilterChange(event.target.value)}
              disabled={disableSearch}
            >
              <option value="all">Todos</option>
              <option value="avaliador">Avaliador</option>
              <option value="empresa">Empresa</option>
              <option value="sem_polo">Sem Polo</option>
            </select>
          </div>
        </div>

        <div style={{ maxWidth: '460px', width: '100%' }}>
          <TableSearchInput
            value={searchValue}
            onSearch={onSearch}
            isLoading={disableSearch}
            placeholder={searchPlaceholder || 'Buscar por nome, email, empresa, polo, perfil ou status...'}
          />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {paginationLoading && !loading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            <span style={{ marginLeft: '10px' }}>Carregando...</span>
          </div>
        )}

        {loading ? (
          <div className="has-text-centered">
            <div className="button is-loading is-white" style={{ pointerEvents: 'none' }}>
              Carregando...
            </div>
          </div>
        ) : showEmptyState ? (
          <p>Nenhum usuario encontrado.</p>
        ) : (
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Empresa</th>
                  <th>Polo(s)</th>
                  <th>Status</th>
                  <th>Perfil</th>
                  <th>Editar</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{getDisplayName(user)}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <CompanyCell {...(companyDataByUserId.get(user.id) || {})} />
                    </td>
                    <td>{renderPoleSummary(user)}</td>
                    <td>
                      <span className={`tag ${user.is_active ? 'is-success' : 'is-danger'}`}>
                        <FontAwesomeIcon icon={user.is_active ? faCheck : faTimes} />
                        &nbsp;{user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${user.is_superuser ? 'is-info' : 'is-warning'}`}>
                        {getRoleLabel(user)}
                      </span>
                    </td>
                    <td>
                      <div className="buttons">
                        <button
                          className="button is-small is-info"
                          onClick={() => onEdit(user)}
                          disabled={paginationLoading}
                          title="Editar usuario"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTable;
