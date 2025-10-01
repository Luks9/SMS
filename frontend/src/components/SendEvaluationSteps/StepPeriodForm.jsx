import React from 'react';
import Select from 'react-select';

const StepPeriodForm = ({ period, onPeriodChange, formOptions, selectedFormOption, onFormChange }) => {
  return (
    <div className="box">
      <div className="columns is-variable is-5">
        <div className="column">
          <div className="field">
            <label className="label">Período (Mês e Ano)</label>
            <div className="control">
              <input
                className="input"
                name="period"
                type="month"
                value={period}
                onChange={onPeriodChange}
                required
              />
            </div>
            <p className="help">Selecione o mês que receberá a avaliação.</p>
          </div>
        </div>
        <div className="column">
          <div className="field">
            <label className="label">Formulário</label>
            <div className="control">
              <Select
                name="form"
                options={formOptions}
                className="basic-single"
                classNamePrefix="select"
                onChange={onFormChange}
                value={selectedFormOption}
                placeholder="Selecione o formulário"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepPeriodForm;
