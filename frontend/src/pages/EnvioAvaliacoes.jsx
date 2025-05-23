// src/pages/EnvioAvaliacoes.jsx

import useFetchForms from '../hooks/useFetchForms';
import useFetchCompany from '../hooks/useFetchCompany';
import useFetchEvaluations from '../hooks/useFetchEvaluations';
import Layout from '../components/Layout';
import SendEvaluationForm from '../components/SendEvaluationForm';
import EvaluationTable from '../components/tables/EvaluationTable';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const EnvioAvaliacoes = () => {
  const { forms } = useFetchForms();
  const { companies } = useFetchCompany();
  const { evaluations, count, currentPage, loading, paginationLoading, fetchEvaluations } = useFetchEvaluations();

  return (
    <Layout>
      <h1 className="title">Avaliações</h1>

      <div className="columns">
        <div className="column">
          <div className="card">
            <header className="card-header">
              <p className="card-header-title">Enviar Avaliação</p>
            </header>
            <div className="card-content">
              <SendEvaluationForm 
                forms={forms} 
                companies={companies} 
                onEvaluationSent={() => fetchEvaluations(currentPage)} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="columns">
        <div className="column">
          <div className="card">
            <header className="card-header">
              <p className="card-header-title">Gerenciar Avaliação</p>
            </header>
            <div className="card-content">
              {loading ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p>Carregando avaliações...</p>
                </div>
              ) : (
                <EvaluationTable 
                  evaluations={evaluations} 
                  count={count}
                  currentPage={currentPage}
                  fetchEvaluations={fetchEvaluations}
                  refreshEvaluations={fetchEvaluations}
                  paginationLoading={paginationLoading} // Passa o estado de carregamento
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EnvioAvaliacoes;