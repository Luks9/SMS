import React from "react";
import { Link } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

const EvaluationCards = ({ evaluations }) => {
  const STATUS_CHOICES = {
    'PENDING': { label: 'Pendente', className: 'is-danger' },
    'IN_PROGRESS': { label: 'Em Progresso', className: 'is-warning' },
    'COMPLETED': { label: 'Concluída', className: 'is-success' },
  };

  // Função para calcular o progresso da avaliação em percentual
  const calculateProgressPercentage = (evaluation) => {
    if (evaluation.total_questions === 0) return 0;
    return Math.round((evaluation.answered_questions / evaluation.total_questions) * 100);
  };

  // Função para determinar a classe da cor da barra de progresso
  const getProgressBarColor = (percentage) => {
    if (percentage <= 25) return 'is-danger';
    if (percentage <= 50) return 'is-warning';
    if (percentage <= 75) return 'is-info';
    return 'is-success';
  };

  return (
    <div className="container">
      <div className="columns is-multiline">
        {evaluations.map((evaluation) => {
          // Declare as constantes fora do JSX
          const progressPercentage = calculateProgressPercentage(evaluation);
          const progressBarColor = getProgressBarColor(progressPercentage);

          return (
            <div key={evaluation.id} className="column is-one-third">
              <div className="card">
                <header className="card-header">
                  <p className="card-header-title">{evaluation.form_name}</p>
                  <button className="card-header-icon" aria-label="more options">
                    <span className="icon">
                      <i className="fas fa-angle-down" aria-hidden="true"></i>
                    </span>
                  </button>
                </header>
                <div className="card-content">
                  <div className="content">
                    <strong>Competencia:</strong> {moment(evaluation.period).format('MMMM YYYY').toUpperCase()} <br />
                    <strong>Pontuação:</strong> {evaluation.score} <br />
                    <strong>Data de Inicio:</strong>{" "}
                    {new Date(evaluation.created_at).toLocaleDateString()}
                    <br />
                    <strong>Validade:</strong>{" "}
                    {new Date(evaluation.valid_until).toLocaleDateString()}
                    <br />
                    <strong>Respondidas:</strong> {evaluation.answered_questions}{" "}
                    / {evaluation.total_questions}
                    <br />
                    <progress
                      className={`progress ${progressBarColor}`}
                      value={progressPercentage}
                      max="100"
                    >
                      {progressPercentage}%
                    </progress>
                  </div>
                </div>
                <footer className="card-footer">
                  <button href="#" className="card-footer-item">
                    <span className={`tag ${STATUS_CHOICES[evaluation.status]?.className}`}>
                      {STATUS_CHOICES[evaluation.status]?.label || evaluation.status}
                    </span>
                  </button>
                  <Link 
                    to={`/evaluation/${evaluation.id}/answer`}
                    className="card-footer-item"
                  >
                    Respostas
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

export default EvaluationCards;
