import { useState, useContext} from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import moment from 'moment';
import 'moment/locale/pt-br';

const SendEvaluationForm = ({ forms, companies, onEvaluationSent }) => {
  const { getToken, user } = useContext(AuthContext);

  // Função para obter o mês e ano atual no formato 'YYYY-MM'
  const getCurrentMonthYear = () => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  };

  const today = moment().format('YYYY-MM-DD');

  const initialFormData = {
    completed_at: new Date().toISOString(), // Data e hora atual
    valid_until: '', // Definida pelo administrador
    score: 0, // Inicialmente 0
    is_active: true, // Sempre ativo
    status: 'PENDING', // Status inicial
    evaluator: user.id, // ID do avaliador, geralmente o usuário logado
    form: null, // Selecionado pelo administrador
    period: getCurrentMonthYear(), // Preenchido com o mês e ano atual
    companies: [], // Add companies array to initialFormData
  };

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  // Novo helper para gerar opções de empresas
  const companyOptions = companies ? companies.map(company => ({ 
    value: company.id, 
    label: company.name 
  })) : [];

  // Adicionar opção "Selecionar Todos"
  const allOption = { value: 'all', label: 'Selecionar Todos' };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCompanyChange = (selectedOptions) => {
    if (selectedOptions?.some(option => option.value === 'all')) {
      // Se "Selecionar Todos" foi escolhido, seleciona todas as empresas
      const allCompanies = companies.map(company => company.id);
      setFormData({
        ...formData,
        companies: allCompanies,
      });
    } else {
      // Caso contrário, usa as empresas selecionadas
      setFormData({
        ...formData,
        companies: selectedOptions ? selectedOptions.map(option => option.value) : [],
      });
    }
  };

  const handleFormChange = (selectedOption) => {
    setFormData({
      ...formData,
      form: selectedOption ? selectedOption.value : null,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.valid_until < today) {
      setMessage('A data limite não pode ser retroativa.');
      setMessageType('error');
      return;
    }

    if (!formData.companies || formData.companies.length === 0) {
      setMessage('Por favor, selecione pelo menos uma empresa');
      setMessageType('error');
      return;
    }

    if (!formData.form) {
      setMessage('Por favor, selecione um formulário');
      setMessageType('error');
      return;
    }

    if (formData.valid_until < today) {
      setMessage('A data limite não pode ser retroativa.');
      setMessageType('error');
      return;
    }

    const formattedPeriod = `${formData.period}-01`;

    try {
      const token = getToken();
      const response = await axios.post('/api/evaluation/', {
        ...formData,
        companies: formData.companies,
        period: formattedPeriod,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage('Avaliações enviadas com sucesso!');
      setMessageType('success');
      setFormData({ ...initialFormData }); // Use spread operator to create a new object

      if (onEvaluationSent) {
        onEvaluationSent();
      }
    } catch (error) {
      if (error.response?.data?.duplicate_companies) {
        const duplicateCompanies = error.response.data.duplicate_companies;
        const message = (
          <div>
            <p>As seguintes empresas já possuem avaliações para este período e formulário:</p>
            <ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '10px' }}>
              {duplicateCompanies.map((company, index) => (
                <li key={index}>{company}</li>
              ))}
            </ul>
          </div>
        );
        setMessage(message);
      } else {
        setMessage(error.response?.data?.message || 'Erro ao enviar avaliações');
      }
      setMessageType('error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {message && (
        <Message
          message={typeof message === 'string' ? message : message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}

      <div className="columns">
        <div className="column">
          <div className="field">
            <label className="label">Período (Mês e Ano)</label>
            <div className="control">
              <input
                className="input"
                name="period"
                type="month"
                value={formData.period}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </div>

        <div className="column">
          <div className="field">
            <label className="label">Empresa</label>
            <div className="control">
              <Select
                name="companies"
                options={[allOption, ...companyOptions]}
                className="basic-single"
                classNamePrefix="select"
                onChange={handleCompanyChange}
                isMulti
                value={companyOptions.filter(option => 
                  formData.companies?.includes(option.value) // Add optional chaining
                )}
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
                options={forms ? forms.map(form => ({ value: form.id, label: form.name })) : []}
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
                min={today}
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
