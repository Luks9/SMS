import React from 'react';

const StepConfirm = ({ period, formName, companies, validUntil, onValidUntilChange, today }) => {
  return (
    <div className="box">
      <div className="content">
        <h3 className="title is-5">Revise as informacoes antes de enviar</h3>
        <div className="columns">
          <div className="column is-half">
            <p><strong>Periodo:</strong> {period}</p>
            <p><strong>Formulario:</strong> {formName || 'Formulario nao selecionado'}</p>
          </div>
          <div className="column is-half">
            <div className="field">
              <label className="label">Data limite para preenchimento</label>
              <div className="control">
                <input
                  className="input"
                  name="valid_until"
                  type="date"
                  min={today}
                  value={validUntil}
                  onChange={onValidUntilChange}
                  required
                />
              </div>
              <p className="help">Defina ate quando o formulario pode ser respondido.</p>
            </div>
          </div>
        </div>
        <div>
          <h4 className="title is-6">Empresas selecionadas</h4>
          {companies.length === 0 ? (
            <p>Nenhuma empresa selecionada.</p>
          ) : (
            <div className="tags">
              {companies.map(company => (
                <span key={company} className="tag is-link is-light">{company}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepConfirm;
