import React, { useContext, useMemo, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/pt-br';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faInfoCircle,
  faClipboardList,
  faFilePdf,
  faFileExcel,
} from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import useFetchCompany from '../hooks/useFetchCompany';
import useFetchCompanyEvaluations from '../hooks/useFetchCompanyEvaluations';
import { STATUS_CHOICES } from '../utils/StatusChoices';
import Message from '../components/Message';
import { AuthContext } from '../context/AuthContext';

moment.locale('pt-br');

const CompanyManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useContext(AuthContext);
  const initialFilters = location.state?.filters || {};
  const { companies, loading: loadingCompanies } = useFetchCompany(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialFilters.companyId || '');
  const [statusFilter, setStatusFilter] = useState(initialFilters.statusFilter || 'all');
  const [periodFilter, setPeriodFilter] = useState(
    initialFilters.periodFilter ?? initialFilters.searchValue ?? ''
  );
  const [exportingId, setExportingId] = useState(null);
  const [exportingFormat, setExportingFormat] = useState(null);
  const [exportError, setExportError] = useState('');

  const {
    evaluations,
    loading: loadingEvaluations,
    error: evaluationsError,
  } = useFetchCompanyEvaluations(selectedCompanyId, true);

  const handleCompanyChange = (event) => {
    setSelectedCompanyId(event.target.value);
    setExportError('');
  };

  const filteredEvaluations = useMemo(() => {
    if (!evaluations || !Array.isArray(evaluations)) {
      return [];
    }

    return evaluations
      .filter((evaluation) => {
        switch (statusFilter) {
          case 'completed':
            return evaluation.status === 'COMPLETED';
          case 'in_progress':
            return evaluation.status === 'IN_PROGRESS';
          case 'expired':
            return evaluation.status === 'EXPIRED';
          case 'cancelled':
            return evaluation.status === 'CANCELLED';
          default:
            return true;
        }
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
    const percentage =
      typeof evaluation.answered_percentage === 'number'
        ? evaluation.answered_percentage
        : evaluation.total_questions
        ? Math.round((evaluation.answered_questions / evaluation.total_questions) * 100)
        : 0;

    return (
      <span className={`tag ${statusInfo.className || 'is-light'}`}>
        {statusInfo.label || evaluation.status} - {percentage}%
      </span>
    );
  };

  const handleExport = async (evaluationId, format) => {
    try {
      setExportError('');
      setExportingId(evaluationId);
      setExportingFormat(format);
      const token = getToken();
      const response = await axios.get(`/api/evaluation/${evaluationId}/export/${format}/`, {
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const contentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([response.data], { type: contentType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `avaliacao_${evaluationId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erro ao exportar a avaliação:', error);
      setExportError('Não foi possível exportar a avaliação. Tente novamente.');
    } finally {
      setExportingId(null);
      setExportingFormat(null);
    }
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
                  <option value="expired">Expiradas</option>
                  <option value="cancelled">Canceladas</option>
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
      {exportError && (
        <Message type="danger" message={exportError} onClose={() => setExportError('')} />
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
                      <th></th>
                      <th>Exportar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvaluations.map((evaluation) => {
                      const isExportingThis = exportingId === evaluation.id;
                      return (
                        <tr key={evaluation.id}>
                          <td>{moment(evaluation.period).format('MMM/YYYY')}</td>
                          <td>{evaluation.form_name}</td>
                          <td>{renderStatusTag(evaluation)}</td>
                          <td>
                            {typeof evaluation.score === 'number' ? (
                              <span className="tag is-dark">{Number(evaluation.score).toFixed(1)}</span>
                            ) : (
                              <span className="tag is-light">Sem nota</span>
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
                          <td className="has-text-right">
                            {evaluation.action_plan ? (
                              <button
                                className="button is-small is-info is-light"
                                onClick={() => navigate(`/action-plan/${evaluation.action_plan}/view`)}
                              >
                                <FontAwesomeIcon icon={faClipboardList} /> &nbsp; Plano de ação
                              </button>
                            ) : (
                              <span className="tag is-light">Sem plano</span>
                            )}
                          </td>
                          <td className="has-text-right">
                            <div className="buttons are-small is-justify-content-flex-end">
                              <button
                                className="button is-light"
                                onClick={() => handleExport(evaluation.id, 'pdf')}
                                disabled={isExportingThis}
                              >
                                {isExportingThis && exportingFormat === 'pdf' ? (
                                  <FontAwesomeIcon icon={faSpinner} spin />
                                ) : (
                                  <>
                                    <FontAwesomeIcon icon={faFilePdf} /> &nbsp; PDF
                                  </>
                                )}
                              </button>
                              <button
                                className="button is-light"
                                onClick={() => handleExport(evaluation.id, 'xlsx')}
                                disabled={isExportingThis}
                              >
                                {isExportingThis && exportingFormat === 'xlsx' ? (
                                  <FontAwesomeIcon icon={faSpinner} spin />
                                ) : (
                                  <>
                                    <FontAwesomeIcon icon={faFileExcel} /> &nbsp; XLSX
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
