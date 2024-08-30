import React, { useState, useContext } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';

const SendEvaluationForm = ({ forms, companies, onEvaluationSent }) => {
  const { getToken, user } = useContext(AuthContext);

  const initialFormData = {
    completed_at: new Date().toISOString(), // Data e hora atual
    valid_until: '', // Definida pelo administrador
    score: 0, // Inicialmente 0
    is_active: true, // Sempre ativo
    status: 'PENDING', // Status inicial
    company: null, // Selecionado pelo administrador
    evaluator: user.id, // ID do avaliador, geralmente o usuário logado
    form: null, // Selecionado pelo administrador
  };

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCompanyChange = (selectedOption) => {
    setFormData({
      ...formData,
      company: selectedOption ? selectedOption.value : null,
    });
  };

  const handleFormChange = (selectedOption) => {
    setFormData({
      ...formData,
      form: selectedOption ? selectedOption.value : null,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const today = new Date().toISOString().split('T')[0]; // Obter a data atual no formato YYYY-MM-DD

    if (formData.valid_until < today) {
      setMessage('A data limite não pode ser retroativa.');
      setMessageType('error');
      return;
    }

    try {
      const token = getToken();
      await axios.post('/api/evaluation/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage('Avaliação enviada com sucesso!');
      setMessageType('success');
      setFormData(initialFormData); // Resetar o formulário após o envio

      if (onEvaluationSent) {
        onEvaluationSent(); // Callback opcional para ações adicionais após o envio
      }
    } catch (error) {
      setMessage('Erro ao enviar a avaliação. Tente novamente.');
      setMessageType('error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <Message
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}
      <div className="columns">
        <div className="column">
          <div className="field">
            <label className="label">Empresa</label>
            <div className="control">
              <Select
                name="company"
                options={companies.map(company => ({ value: company.id, label: company.name }))}
                className="basic-single"
                classNamePrefix="select"
                onChange={handleCompanyChange}
              />
            </div>
          </div>
        </div>

        <div className="column">
          <div className="field">
            <label className="label">Formulário</label>
            <div className="control">
              <Select
                name="form"
                options={forms.map(form => ({ value: form.id, label: form.name }))}
                className="basic-single"
                classNamePrefix="select"
                onChange={handleFormChange}
              />
            </div>
          </div>
        </div>

        <div className="column">
          <div className="field">
            <label className="label">Data Limite</label>
            <div className="control">
              <input
                className="input"
                name="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div className="field is-grouped">
        <div className="control">
          <button type="submit" className="button is-link">
            Enviar Avaliação
          </button>
        </div>
      </div>
    </form>
  );
};

export default SendEvaluationForm;
