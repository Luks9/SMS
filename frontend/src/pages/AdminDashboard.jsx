import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import '../styles/MonthlyDashboard.css';

const now = new Date();

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

const statusLabels = {
  not_started: { label: 'Nao iniciada', className: 'is-light' },
  in_progress: { label: 'Em andamento', className: 'is-warning' },
  completed: { label: 'Concluida', className: 'is-success' },
};

const actionStatusLabels = {
  pending: { label: 'Pendente', className: 'is-light' },
  overdue: { label: 'Vencida', className: 'is-danger' },
  awaiting_evidence: { label: 'Aguardando evidencia', className: 'is-warning' },
  awaiting_validation: { label: 'Aguardando validacao', className: 'is-info' },
  completed: { label: 'Concluida', className: 'is-success' },
};

const MonthlyKpiCard = ({ title, value, subtitle, tone = 'default', loading }) => (
  <div className={`monthly-kpi-card ${tone}`}>
    {loading ? (
      <div className="monthly-skeleton monthly-skeleton-card" />
    ) : (
      <>
        <p className="monthly-kpi-title">{title}</p>
        <p className="monthly-kpi-value">{value}</p>
        {subtitle ? <p className="monthly-kpi-subtitle">{subtitle}</p> : null}
      </>
    )}
  </div>
);

const PoleChip = ({ company }) => {
  const poles = company?.poles || [];
  if (!poles.length) return <span className="tag is-light">Sem polo</span>;
  const [first, ...rest] = poles;
  const tooltip = poles.map((p) => p.name).join(', ');
  return (
    <div title={tooltip} className="pole-chip-group">
      <span className="tag is-link is-light">{company.company_abbr} · {first.name}</span>
      {rest.length > 0 ? <span className="tag is-info is-light">+{rest.length}</span> : null}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { getToken } = useContext(AuthContext);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const response = await axios.get('/api/dashboard/monthly/', {
        params: { month, year, page, page_size: pageSize },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDashboard(response.data);
    } catch (fetchError) {
      console.error('Erro ao carregar dashboard mensal:', fetchError);
      setError('Nao foi possivel carregar o dashboard mensal.');
    } finally {
      setLoading(false);
    }
  }, [getToken, month, year, page, pageSize]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const filteredCompanies = useMemo(() => {
    const rows = dashboard?.companies || [];
    const query = companySearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const poles = (row.poles || []).map((p) => p.name).join(' ').toLowerCase();
      const score = row.score != null ? String(row.score) : '';
      return (
        row.company_name?.toLowerCase().includes(query)
        || row.company_abbr?.toLowerCase().includes(query)
        || row.status_label?.toLowerCase().includes(query)
        || poles.includes(query)
        || score.includes(query)
      );
    });
  }, [dashboard?.companies, companySearch]);

  const pendingCompanies = useMemo(
    () => filteredCompanies.filter((row) => row.status !== 'completed' || row.actions_overdue > 0 || row.actions_pending > 0),
    [filteredCompanies]
  );

  const filteredActions = useMemo(() => {
    const rows = dashboard?.actions || [];
    if (actionFilter === 'all') return rows;
    return rows.filter((row) => row.status === actionFilter);
  }, [dashboard?.actions, actionFilter]);

  const openCompanyDetail = useCallback(async (companyId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const token = getToken();
      const response = await axios.get(`/api/companies/${companyId}/monthly-detail/`, {
        params: { month, year },
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetailData(response.data);
    } catch (detailError) {
      console.error('Erro ao carregar detalhe mensal da empresa:', detailError);
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, [getToken, month, year]);

  const handleExport = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/dashboard/monthly/export/', {
        params: { month, year },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_mensal_${year}_${String(month).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error('Erro ao exportar CSV mensal:', exportError);
      setError('Nao foi possivel exportar o CSV.');
    }
  }, [getToken, month, year]);

  const checklist = dashboard?.checklist || {};
  const pagination = dashboard?.pagination || {};

  return (
    <Layout>
      <div className="monthly-dashboard-header">
        <div>
          <h1 className="title is-4">Dashboard Mensal</h1>
          <p className="subtitle is-6">
            Acompanhamento de avaliacao, pendencias e plano de acao por competencia.
          </p>
        </div>
        <div className="monthly-dashboard-filters">
          <div className="select is-small">
            <select value={month} onChange={(event) => { setPage(1); setMonth(Number(event.target.value)); }}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
          <div className="select is-small">
            <select value={year} onChange={(event) => { setPage(1); setYear(Number(event.target.value)); }}>
              {Array.from({ length: 6 }, (_, index) => now.getFullYear() - 2 + index).map((yearOption) => (
                <option key={yearOption} value={yearOption}>{yearOption}</option>
              ))}
            </select>
          </div>
          <button type="button" className="button is-small is-link is-light" onClick={fetchDashboard} disabled={loading}>
            Atualizar
          </button>
          <button type="button" className="button is-small is-success is-light" onClick={handleExport} disabled={loading}>
            Exportar CSV
          </button>
        </div>
      </div>

      {error ? <div className="notification is-danger is-light">{error}</div> : null}

      <div className="monthly-kpi-grid">
        <MonthlyKpiCard title="Empresas elegiveis" value={dashboard?.kpis?.eligible || 0} loading={loading} />
        <MonthlyKpiCard title="Concluidas" value={dashboard?.kpis?.completed || 0} loading={loading} tone="success" />
        <MonthlyKpiCard title="Pendentes" value={dashboard?.kpis?.pending || 0} loading={loading} tone="warning" />
        <MonthlyKpiCard title="Em andamento" value={dashboard?.kpis?.in_progress || 0} loading={loading} tone="info" />
        <MonthlyKpiCard
          title="Acoes pendentes"
          value={dashboard?.kpis?.actions_pending || 0}
          subtitle={`Vencidas: ${dashboard?.kpis?.actions_overdue || 0}`}
          loading={loading}
          tone="danger"
        />
      </div>

      <div className="box">
        <h2 className="title is-6">Checklist do Administrador/Avaliador</h2>
        <div className="columns is-multiline is-mobile">
          <div className="column is-6">
            <p><strong>Avaliacoes nao iniciadas:</strong> {checklist.evaluations_not_started?.length || 0}</p>
          </div>
          <div className="column is-6">
            <p><strong>Avaliacoes em andamento:</strong> {checklist.evaluations_in_progress?.length || 0}</p>
          </div>
          <div className="column is-6">
            <p><strong>Acoes vencidas:</strong> {checklist.actions_overdue?.length || 0}</p>
          </div>
          <div className="column is-6">
            <p><strong>Aguardando validacao:</strong> {checklist.actions_waiting_validation?.length || 0}</p>
          </div>
          <div className="column is-6">
            <p><strong>Evidencias pendentes:</strong> {checklist.evidences_pending?.length || 0}</p>
          </div>
          <div className="column is-6">
            <p><strong>Inconsistencias cadastrais:</strong> {checklist.data_inconsistencies?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="box">
        <div className="monthly-section-header">
          <h2 className="title is-6">Empresas no mes</h2>
          <div className="field">
            <div className="control">
              <input
                className="input is-small"
                placeholder="Filtrar empresas..."
                value={companySearch}
                onChange={(event) => setCompanySearch(event.target.value)}
              />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="monthly-skeleton monthly-skeleton-table" />
        ) : filteredCompanies.length === 0 ? (
          <div className="notification is-light">Nenhuma empresa para a competencia selecionada.</div>
        ) : (
          <div className="table-container">
            <table className="table is-fullwidth is-striped is-hoverable">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Polo(s)</th>
                  <th>Status</th>
                  <th>Ultima atualizacao</th>
                  <th>Pontuacao</th>
                  <th>Acoes pendentes</th>
                  <th>Acoes vencidas</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((row) => (
                  <tr key={row.company_id}>
                    <td>
                      <button type="button" className="button is-text p-0" onClick={() => openCompanyDetail(row.company_id)}>
                        {row.company_name}
                      </button>
                    </td>
                    <td><PoleChip company={row} /></td>
                    <td>
                      <span className={`tag ${statusLabels[row.status]?.className || 'is-light'}`}>
                        {statusLabels[row.status]?.label || row.status_label}
                      </span>
                    </td>
                    <td>{formatDateTime(row.last_updated_at)}</td>
                    <td>{typeof row.score === 'number' ? row.score.toFixed(2) : '-'}</td>
                    <td>{row.actions_pending}</td>
                    <td>
                      <span className={`tag ${row.actions_overdue > 0 ? 'is-danger' : 'is-success'} is-light`}>
                        {row.actions_overdue}
                      </span>
                    </td>
                    <td>
                      <div className="buttons are-small">
                        <button
                          type="button"
                          className="button is-link is-light"
                          disabled={!row.latest_evaluation_id}
                          onClick={() => navigate(`/evaluation/${row.latest_evaluation_id}/details`)}
                        >
                          Abrir avaliacao
                        </button>
                        <button
                          type="button"
                          className="button is-warning is-light"
                          disabled={!row.latest_action_plan_id}
                          onClick={() => navigate(`/action-plan/${row.latest_action_plan_id}/view`)}
                        >
                          Abrir plano
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="monthly-pagination">
          <button
            type="button"
            className="button is-small"
            disabled={!pagination.has_previous || loading}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Anterior
          </button>
          <span>Pagina {pagination.page || 1}</span>
          <button
            type="button"
            className="button is-small"
            disabled={!pagination.has_next || loading}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Proxima
          </button>
        </div>
      </div>

      <div className="columns">
        <div className="column">
          <div className="box">
            <h2 className="title is-6">Pendencias por empresa</h2>
            {pendingCompanies.length === 0 ? (
              <div className="notification is-light">Sem pendencias criticas no periodo.</div>
            ) : (
              <div className="table-container">
                <table className="table is-fullwidth is-hoverable is-striped">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Status</th>
                      <th>Pendentes</th>
                      <th>Vencidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCompanies.map((row) => (
                      <tr key={`pending-${row.company_id}`}>
                        <td>{row.company_name}</td>
                        <td>{row.status_label}</td>
                        <td>{row.actions_pending}</td>
                        <td>{row.actions_overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="column">
          <div className="box">
            <div className="monthly-section-header">
              <h2 className="title is-6">Acoes pendentes</h2>
              <div className="select is-small">
                <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Vencida</option>
                  <option value="awaiting_evidence">Aguardando evidencia</option>
                  <option value="awaiting_validation">Aguardando validacao</option>
                </select>
              </div>
            </div>
            {filteredActions.length === 0 ? (
              <div className="notification is-light">Nenhuma acao para o filtro selecionado.</div>
            ) : (
              <div className="monthly-actions-list">
                {filteredActions.map((action) => (
                  <div key={action.id} className="monthly-action-row">
                    <div>
                      <strong>{action.company}</strong>
                      <p>{action.description}</p>
                      <small>Prazo: {action.due_date || '-'}</small>
                    </div>
                    <span className={`tag ${actionStatusLabels[action.status]?.className || 'is-light'}`}>
                      {actionStatusLabels[action.status]?.label || action.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {detailOpen ? (
        <div className={`modal ${detailOpen ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={() => setDetailOpen(false)} />
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Detalhe mensal da empresa</p>
              <button type="button" className="delete" aria-label="close" onClick={() => setDetailOpen(false)} />
            </header>
            <section className="modal-card-body">
              {detailLoading ? (
                <div className="monthly-skeleton monthly-skeleton-table" />
              ) : !detailData ? (
                <div className="notification is-warning is-light">Nao foi possivel carregar o detalhe.</div>
              ) : (
                <>
                  <h3 className="title is-6">{detailData.company?.name}</h3>
                  <p>
                    <strong>Status:</strong> {detailData.summary?.completed || 0} concluidas, {detailData.summary?.in_progress || 0} em andamento
                  </p>
                  <p><strong>Responsaveis:</strong> {(detailData.summary?.responsibles || []).join(', ') || '-'}</p>
                  <hr />
                  <h4 className="title is-6">Itens/questoes pendentes</h4>
                  {(detailData.pending_items || []).length === 0 ? (
                    <p>Nenhuma pendencia de questionario.</p>
                  ) : (
                    <ul>
                      {detailData.pending_items.map((item) => (
                        <li key={item.evaluation_id}>
                          {item.form_name}: {item.pending_questions} pendente(s) ({item.answered_questions}/{item.total_questions})
                        </li>
                      ))}
                    </ul>
                  )}
                  <hr />
                  <h4 className="title is-6">Plano de acao</h4>
                  {(detailData.actions || []).length === 0 ? (
                    <p>Sem acoes para o periodo.</p>
                  ) : (
                    <div className="table-container">
                      <table className="table is-fullwidth is-striped">
                        <thead>
                          <tr>
                            <th>Descricao</th>
                            <th>Responsavel</th>
                            <th>Prazo</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.actions.map((item) => (
                            <tr key={item.id}>
                              <td>{item.description}</td>
                              <td>{item.responsible || '-'}</td>
                              <td>{item.due_date || '-'}</td>
                              <td>{actionStatusLabels[item.status]?.label || item.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </Layout>
  );
};

export default AdminDashboard;
