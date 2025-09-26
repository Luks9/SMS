import React from 'react';
import Select from 'react-select';

const StepCompanies = ({ companyOptions, selectedOptions, onChange }) => {
  return (
    <div className="box">
      <div className="field">
        <label className="label">Empresas</label>
        <div className="control">
          <Select
            name="companies"
            options={companyOptions}
            className="basic-single"
            classNamePrefix="select"
            onChange={onChange}
            isMulti
            value={selectedOptions}
            placeholder="Selecione as empresas"
          />
        </div>
        <p className="help">Use "Selecionar Todos" para incluir todas as empresas de uma vez.</p>
      </div>
    </div>
  );
};

export default StepCompanies;
