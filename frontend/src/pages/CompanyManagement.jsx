import React, { useMemo, useState } from 'react';
import moment from 'moment';
import 'moment/locale/pt-br';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/Layout';
import useFetchCompany from '../hooks/useFetchCompany';
import useFetchCompanyEvaluations from '../hooks/useFetchCompanyEvaluations';
import { STATUS_CHOICES } from '../utils/StatusChoices';
import Message from '../components/Message';
import { useNavigate, useLocation } from 'react-router-dom';

moment.locale('pt-br');

const CompanyManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilters = location.state?.filters || {};
  const { companies, loading: loadingCompanies } = useFetchCompany(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialFilters.companyId || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || 'all');
  const [periodFilter, setPeriodFilter] = useState(
    initialFilters.periodFilter ?? initialFilters.searchValue ?? ''
  );

  const {
    evaluations,
    loading: loadingEvaluations,
    error: evaluationsError,
  } = useFetchCompanyEvaluations(selectedCompanyId, true);

  const handleCompanyChange = (event) => {
    setSelectedCompanyId(event.target.value);
  };

  const filteredEvaluations = useMemo(() => {
    if (!evaluations || !Array.isArray(evaluations)) {
      return [];
    }

    return evaluations
      .filter((evaluation) => {
        if (statusFilter === 'completed') {
          return evaluation.status === 'COMPLETED' || evaluation.answered_questions === evaluation.total_questions;
        }
        if (statusFilter === 'in_progress') {
          return evaluation.status !== 'COMPLETED';
        }
        return true;
      })
      .filter((evaluation) => {
        if (!periodFilter) return true;
        const evaluationPeriod = moment(evaluation.period).format('YYYY-MM');
        return evaluationPeriod === periodFilter;
      })
      .sort((a, b) => new Date(b.period) - new Date(a.period));
  }, [evaluations, statusFilter, periodFilter]);

  const renderStatusTag = (evaluation) => {
    const statusInfo = STATUS_CHOICES[evaluation.status] || {};
    const percentage = evaluation.total_questions
      ? Math.round((evaluation.answered_questions / evaluation.total_questions) * 100)
      : 0;

    return (
      <span className={`tag ${statusInfo.className || 'is-light'}`}>
        {statusInfo.label || evaluation.status} • {percentage}%
      </span>
    );
  };

  return (
    <Layout>
      <h1 className="title">Gerenciar Empresa</h1>

      <div className="box">
        <div className="columns is-multiline">
          <div className="column is-4">
            <div className="field">
              <label className="label">Empresa</label>
              <div className="control select is-fullwidth">
                <select value={selectedCompanyId} onChange={handleCompanyChange} disabled={loadingCompanies}>
                  <option value="">Selecione uma empresa</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="column is-3">
            <div className="field">
              <label className="label">Status</label>
              <div className="control select is-fullwidth">
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="completed">Respondidas</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="all">Todas</option>
                </select>
              </div>
            </div>
          </div>

          <div className="column is-5">
            <div className="field">
              <label className="label">Período</label>
              <div className="control">
                <input
                  type="month"
                  className="input"
                  value={periodFilter}
                  onChange={(event) => setPeriodFilter(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {evaluationsError && (
        <Message type="danger" message="Não foi possível carregar as avaliações da empresa selecionada." />
      )}

      {!selectedCompanyId ? (
        <div className="notification is-light">
          <FontAwesomeIcon icon={faInfoCircle} /> &nbsp; Escolha uma empresa para visualizar as avaliações respondidas.
        </div>
      ) : (
        <div className="card">
          <header className="card-header">
            <p className="card-header-title">Avaliações encontradas ({filteredEvaluations.length})</p>
          </header>
          <div className="card-content">
            {loadingEvaluations ? (
              <p>
                <FontAwesomeIcon icon={faSpinner} spin /> &nbsp; Carregando avaliações...
              </p>
            ) : filteredEvaluations.length === 0 ? (
              <p>Nenhuma avaliação encontrada com os filtros selecionados.</p>
            ) : (
              <div className="table-container">
                <table className="table is-fullwidth is-striped is-hoverable">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Formulário</th>
                      <th>Status</th>
                      <th>Nota</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvaluations.map((evaluation) => (
                      <tr key={evaluation.id}>
                        <td>{moment(evaluation.period).format('MMM/YYYY')}</td>
                        <td>{evaluation.form_name}</td>
                        <td>{renderStatusTag(evaluation)}</td>
                        <td>
                          {evaluation.score !== null ? (
                            <span className="tag is-dark">{Number(evaluation.score).toFixed(1)}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="has-text-right">
                          <button
                            className="button is-small is-link is-light"
                            onClick={() =>
                              navigate(`/evaluation/${evaluation.id}/details`, {
                                state: {
                                  from: 'company-management',
                                  filters: {
                                    companyId: selectedCompanyId,
                                    statusFilter,
                                    periodFilter,
                                  },
                                },
                              })
                            }
                          >
                            Ver detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CompanyManagement;
