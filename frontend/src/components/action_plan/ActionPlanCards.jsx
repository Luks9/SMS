import React from "react";
import { Link } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const ActionPlanCards = ({ actionsPlans }) => {

    const STATUS_CHOICES = {
        'PENDING': { label: 'Pendente', className: 'is-danger' },
        'IN_PROGRESS': { label: 'Em Progresso', className: 'is-warning' },
        'COMPLETED': { label: 'Concluída', className: 'is-success' },
    };

  return (
    <div className="container">
      <div className="columns is-multiline">
        {actionsPlans && actionsPlans.map((actionPlan) => {
          const isExpired = moment(actionPlan.end_date).isBefore(moment(), 'day'); // Verifica se a data de término está expirada

          return (
            <div key={actionPlan.id} className="column is-one-third">
              <div className="card">
                <header className="card-header">
                  <p className="card-header-title">
                    Plano de Ação - {moment(actionPlan.created_at).format('MMM YYYY').toUpperCase()}
                  </p>
                  <button className="card-header-icon" aria-label="more options">
                    <span className="icon">
                      <i className="fas fa-angle-down" aria-hidden="true"></i>
                    </span>
                  </button>
                </header>
                <div className="card-content">
                  <div className="content">
                    <strong>Status:</strong> <span className={`tag ${STATUS_CHOICES[actionPlan.status]?.className}`}>
                      {STATUS_CHOICES[actionPlan.status]?.label || actionPlan.status}
                    </span>
                    <br />
                    <strong>Empresa:</strong> {actionPlan.company_name}
                    <br />
                    <strong>Descrição:</strong> {actionPlan.description}
                    <br />
                    <strong>Data de Término:</strong>{" "}
                    {moment(actionPlan.end_date).format('DD/MM/YYYY')}                    
                  </div>
                </div>
                <footer className="card-footer">
                  {/* Verifica se o plano está expirado ou não */}
                  <Link
                    to={isExpired ? `/action-plan/${actionPlan.id}` : `/action-plan/${actionPlan.id}/answer`}
                    className="card-footer-item"
                  >
                    {isExpired ? 'Visualizar Plano' : 'Respostas'}
                  </Link>
                </footer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionPlanCards;
