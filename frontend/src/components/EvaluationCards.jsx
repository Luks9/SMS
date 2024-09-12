import React from "react";

const EvaluationCards = ({ evaluations }) => {
  return (
    <div className="container">
      <div className="columns is-multiline">
        {evaluations.map((evaluation) => (
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
                  <strong>Empresa:</strong> {evaluation.company_name} <br />
                  <strong>Status:</strong> {evaluation.status} <br />
                  <strong>Pontuação:</strong> {evaluation.score} <br />
                  <strong>Data de Criação:</strong>{" "}
                  {new Date(evaluation.created_at).toLocaleDateString()}
                  <br />
                  <strong>Validade:</strong>{" "}
                  {new Date(evaluation.valid_until).toLocaleDateString()}
                  <br />
                  <strong>Respondidas:</strong> {evaluation.answered_questions}{" "}
                  / {evaluation.total_questions}
                </div>
              </div>
              <footer className="card-footer">
                <a href="#" className="card-footer-item">Salvar</a>
                
                <a href="#" className="card-footer-item">Excluir</a>
              </footer>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvaluationCards;
