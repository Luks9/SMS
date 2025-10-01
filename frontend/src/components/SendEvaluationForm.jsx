import { useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import moment from 'moment';
import 'moment/locale/pt-br';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import StepIndicator from './SendEvaluationSteps/StepIndicator';
import StepPeriodForm from './SendEvaluationSteps/StepPeriodForm';
import StepCompanies from './SendEvaluationSteps/StepCompanies';
import StepConfirm from './SendEvaluationSteps/StepConfirm';

const ALL_COMPANIES_OPTION = { value: 'all', label: 'Selecionar Todos' };

const STEPS = [
  { id: 1, title: 'Período', description: 'Selecionar período e formulário' },
  { id: 2, title: 'Empresas', description: 'Escolher empresas participantes' },
  { id: 3, title: 'Confirmar', description: 'Revisar dados e enviar' },
];

const SendEvaluationForm = ({ forms, companies, onEvaluationSent }) => {
  const { getToken, user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const today = moment().format('YYYY-MM-DD');

  const createInitialFormData = () => ({
    completed_at: new Date().toISOString(),
    valid_until: '',
    score: 0,
    is_active: true,
    status: 'PENDING',
    evaluator: user.id,
    form: null,
    period: moment().format('YYYY-MM'),
    companies: [],
  });

  const [formData, setFormData] = useState(createInitialFormData);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [currentStep, setCurrentStep] = useState(1);

  const formOptions = useMemo(
    () => (forms ? forms.map(form => ({ value: form.id, label: form.name })) : []),
    [forms]
  );

  const companyOptions = useMemo(
    () => (companies ? companies.map(company => ({ value: company.id, label: company.name })) : []),
    [companies]
  );

  const companyOptionsWithAll = useMemo(
    () => [ALL_COMPANIES_OPTION, ...companyOptions],
    [companyOptions]
  );

  const selectedFormOption = useMemo(
    () => formOptions.find(option => option.value === formData.form) || null,
    [formOptions, formData.form]
  );

  const selectedCompanyOptions = useMemo(
    () => companyOptions.filter(option => formData.companies.includes(option.value)),
    [companyOptions, formData.companies]
  );

  const selectedCompanyNames = useMemo(
    () => (companies || [])
      .filter(company => formData.companies.includes(company.id))
      .map(company => company.name),
    [companies, formData.companies]
  );

  const formattedPeriodLabel = useMemo(
    () => (formData.period ? moment(formData.period, 'YYYY-MM').format('MM/YYYY') : '-'),
    [formData.period]
  );

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setMessage('');
  };

  const handleFormChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      form: selectedOption ? selectedOption.value : null,
    }));
    setMessage('');
  };

  const handleCompanyChange = (selectedOptions) => {
    if (selectedOptions?.some(option => option.value === ALL_COMPANIES_OPTION.value)) {
      const allCompanies = companies ? companies.map(company => company.id) : [];
      setFormData(prev => ({
        ...prev,
        companies: allCompanies,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        companies: selectedOptions ? selectedOptions.map(option => option.value) : [],
      }));
    }
    setMessage('');
  };

  const validateStep = (step) => {
    if (step === 1) {
      if (!formData.period) {
        setMessage('Por favor, selecione um periodo.');
        setMessageType('error');
        return false;
      }

      if (!formData.form) {
        setMessage('Por favor, selecione um formulário.');
        setMessageType('error');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.companies || formData.companies.length === 0) {
        setMessage('Por favor, selecione pelo menos uma empresa.');
        setMessageType('error');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    setMessage('');
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  };

  const handlePreviousStep = () => {
    setMessage('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.form) {
      setMessage('Por favor, selecione um formulário.');
      setMessageType('error');
      setCurrentStep(1);
      return;
    }

    if (!formData.companies || formData.companies.length === 0) {
      setMessage('Por favor, selecione pelo menos uma empresa.');
      setMessageType('error');
      setCurrentStep(2);
      return;
    }

    if (!formData.valid_until) {
      setMessage('Por favor, defina a data limite para preenchimento.');
      setMessageType('error');
      return;
    }

    if (formData.valid_until < today) {
      setMessage('A data limite nao pode ser retroativa.');
      setMessageType('error');
      return;
    }

    const formattedPeriod = `${formData.period}-01`;

    try {
      setIsLoading(true);
      const token = getToken();
      await axios.post(
        '/api/evaluation/',
        {
          ...formData,
          companies: formData.companies,
          period: formattedPeriod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage('Avaliacoes enviadas com sucesso!');
      setMessageType('success');
      setFormData(createInitialFormData());
      setCurrentStep(1);

      if (onEvaluationSent) {
        onEvaluationSent();
      }
    } catch (error) {
      if (error.response?.data?.duplicate_companies) {
        const duplicateCompanies = error.response.data.duplicate_companies;
        const duplicateMessage = (
          <div>
            <p>As seguintes empresas já possuem avaliações para este período e formulário:</p>
            <ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '10px' }}>
              {duplicateCompanies.map((company, index) => (
                <li key={index}>{company}</li>
              ))}
            </ul>
          </div>
        );
        setMessage(duplicateMessage);
      } else {
        setMessage(error.response?.data?.message || 'Erro ao enviar avaliacoes');
      }
      setMessageType('error');
    } finally {
      setIsLoading(false);
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

      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {currentStep === 1 && (
        <StepPeriodForm
          period={formData.period}
          onPeriodChange={handleInputChange}
          formOptions={formOptions}
          selectedFormOption={selectedFormOption}
          onFormChange={handleFormChange}
        />
      )}

      {currentStep === 2 && (
        <StepCompanies
          companyOptions={companyOptionsWithAll}
          selectedOptions={selectedCompanyOptions}
          onChange={handleCompanyChange}
        />
      )}

      {currentStep === 3 && (
        <StepConfirm
          period={formattedPeriodLabel}
          formName={selectedFormOption?.label}
          companies={selectedCompanyNames}
          validUntil={formData.valid_until}
          onValidUntilChange={handleInputChange}
          today={today}
        />
      )}

      <div className="field is-grouped is-justify-content-flex-end">
        {currentStep > 1 && (
          <div className="control">
            <button type="button" className="button is-light" onClick={handlePreviousStep}>
              Voltar
            </button>
          </div>
        )}

        {currentStep < STEPS.length && (
          <div className="control">
            <button type="button" className="button is-link" onClick={handleNextStep}>
              Continuar
            </button>
          </div>
        )}

        {currentStep === STEPS.length && (
          <div className="control">
            <button type="submit" className="button is-link" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Enviando...
                </>
              ) : (
                'Enviar Avaliacao'
              )}
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default SendEvaluationForm;
