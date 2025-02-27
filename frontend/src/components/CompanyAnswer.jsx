import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import moment from 'moment';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faEdit, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import useFetchCompanyQuestions from '../hooks/useFetchCompanyQuestions';  // Importa o hook

const CompanyAnswer = () => {
  const { id } = useParams();  // Pega o ID da avaliação da URL
  const { questions, loading, error, fetchQuestions } = useFetchCompanyQuestions(id); // Usa o hook para buscar perguntas
  const { getToken } = useContext(AuthContext);  // Pega o token de autenticação do contexto
  const [selectedAnswers, setSelectedAnswers] = useState({});  // Armazena as respostas da empresa
  const [selectedFiles, setSelectedFiles] = useState({});  // Armazena os arquivos anexados
  const [fileNames, setFileNames] = useState({});  // Armazena os nomes dos arquivos selecionados
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('');  // Aba ativa
  const [isEditing, setIsEditing] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);  // Estado de carregamento

  const ANSWER_CHOICES_MAP = {
    'NA': { label: 'Não Aplicável', color: 'is-light' },
    'C': { label: 'Conforme', color: 'is-success' },
    'NC': { label: 'Não Conforme', color: 'is-danger' },
    'A': { label: 'Em Análise', color: 'is-warning' },
  };

  // Agrupar perguntas por categoria
  const groupedQuestions = questions.reduce((groups, question) => {
    const categoryName = question.category_name || 'Sem Categoria';
    if (!groups[categoryName]) {
      groups[categoryName] = [];
    }
    groups[categoryName].push(question);
    return groups;
  }, {});

  useEffect(() => {
    if (!loading && !error && Object.keys(groupedQuestions).length > 0 && activeTab === '') {
      setActiveTab(Object.keys(groupedQuestions)[0]);
    }
  }, [loading, error, groupedQuestions, activeTab]);

  const handleSelectChange = (questionId, newValue) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: newValue,
    });
  };

  const handleFileChange = (questionId, file) => {
    setSelectedFiles({
      ...selectedFiles,
      [questionId]: file,
    });
    setFileNames({
      ...fileNames,
      [questionId]: file.name,  // Armazena o nome do arquivo selecionado
    });
  };

  const handleSubmit = async (questionId, answerId = null) => {
    setIsSubmitting(true);  // Inicia o estado de carregamento
    try {
      const token = getToken();
      const formData = new FormData();
  
      const selectedAnswer = selectedAnswers[questionId] !== undefined ? selectedAnswers[questionId] : questions.find(q => q.id === questionId).answer.answer_respondent;
      const selectedFile = selectedFiles[questionId];
      const company = localStorage.getItem('companyId');
      formData.append('answer_respondent', selectedAnswer || '');
      formData.append('date_respondent', moment().format('YYYY-MM-DD'));
  
      if (selectedFile) {
        formData.append('attachment_respondent', selectedFile);
      }
  
      if (!answerId) {
        formData.append('question', questionId);
        formData.append('evaluation', id);
        formData.append('company', company);
      }
  
      const url = answerId ? `/api/answers/${answerId}/` : '/api/answers/';
      const method = answerId ? 'patch' : 'post';
  
      await axios({
        method: method,
        url: url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      setMessage(answerId ? 'Resposta atualizada com sucesso!' : 'Resposta criada com sucesso!');
      setMessageType('success');
      await fetchQuestions();  // Aguarda a conclusão do fetchQuestions
  
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: '' }));
      setSelectedFiles((prev) => ({ ...prev, [questionId]: null }));
      setFileNames((prev) => ({ ...prev, [questionId]: '' }));
  
      toggleEdit(questionId);
  
    } catch (error) {
      console.error('Erro ao salvar a resposta:', error);
      setMessage('Erro ao salvar a resposta. Por favor, tente novamente.');
      setMessageType('danger');
    } finally {
      setIsSubmitting(false);  // Finaliza o estado de carregamento
    }
  };

  const handleDownload = async (answerId, fileName) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/download/attachment_respondent/${answerId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
    }
  };

  const toggleEdit = (questionId) => {
    setIsEditing({
      ...isEditing,
      [questionId]: !isEditing[questionId],
    });
  };

  return (
    <Layout>
      {message && (
        <Message
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}

      <h1 className="title">Responder Avaliação</h1>

      <div className="tabs is-boxed">
        <ul>
          {Object.keys(groupedQuestions).map((categoryName) => (
            <li
              key={categoryName}
              className={activeTab === categoryName ? 'is-active' : ''}
              onClick={() => setActiveTab(categoryName)}
            >
              <a>{categoryName}</a>
            </li>
          ))}
        </ul>
      </div>

      {loading ? (
        <p>Carregando perguntas...</p>
      ) : error ? (
        <Message type="danger" message={error} onClose={() => {}} />
      ) : (
        <div>
          {Object.keys(groupedQuestions).map((categoryName) => (
            <div key={categoryName} style={{ display: activeTab === categoryName ? 'block' : 'none' }}>
              {groupedQuestions[categoryName].map((question) => {
                const answer = question.answer || {};
                const isAnswerProvided = !!answer.answer_respondent;
                return (
                  <div key={question.id} className="box">
                    <div className="columns is-vcentered">
                      <div className="column">
                        <h2 className="subtitle">{question.question}</h2>
                        <p className="mb-4">{question.recommendation}</p>
                      </div>

                      <div className="column is-narrow">
                        <div className="is-pulled-right">
                          {isAnswerProvided && (
                            <FontAwesomeIcon
                              icon={isEditing[question.id] ? faTimes : faEdit}
                              className="is-clickable"
                              onClick={() => toggleEdit(question.id)}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {isAnswerProvided && !isEditing[question.id] ? (
                      <div className="columns">
                        <div className="column is-one-third">
                          <p><strong>Resposta da empresa: </strong>
                            <span className={`tag ${ANSWER_CHOICES_MAP[answer.answer_respondent]?.color || 'is-light'}`}>
                              {ANSWER_CHOICES_MAP[answer.answer_respondent]?.label || 'Aguardando resposta'}
                            </span>
                          </p>
                        </div>
                        <div className="column is-one-third">
                          <p><strong>Nota da empresa: </strong> {answer.note || 'Não disponível'}</p>
                        </div>
                        <div className="column">
                          {answer.attachment_respondent ? (
                            <div>
                              <button
                                onClick={() => handleDownload(answer.id, answer.attachment_respondent.split('/').pop())}
                              >
                                <FontAwesomeIcon icon={faFileDownload} /> Baixar Anexo
                              </button>
                            </div>
                          ) : (
                            <p className="has-text-grey">Nenhum anexo disponível.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="columns">
                        <div className="column is-one-third">
                          <div className="field">
                            <label className="label">Resposta:</label>
                            <div className="control">
                              <div className="select is-fullwidth">
                                <select
                                  onChange={(e) => handleSelectChange(question.id, e.target.value)}
                                  value={selectedAnswers[question.id] !== undefined ? selectedAnswers[question.id] : answer.answer_respondent || ''}
                                >
                                  <option value="" disabled>Selecione uma resposta</option>
                                  {Object.entries(ANSWER_CHOICES_MAP).map(([value, { label }]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="column is-one-third">
                          <div className="field">
                            <label className="label">Anexo (opcional):</label>
                            <div className="file has-name is-fullwidth">
                              <label className="file-label">
                                <input
                                  className="file-input"
                                  type="file"
                                  onChange={(e) => handleFileChange(question.id, e.target.files[0])}
                                />
                                <span className="file-cta">
                                  <span className="file-icon">
                                    <i className="fas fa-upload"></i>
                                  </span>
                                  <span className="file-label">Escolha um arquivo</span>
                                </span>

                                <span className="file-name">
                                  {fileNames[question.id] || 'Nenhum arquivo selecionado'}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {(isEditing[question.id] || !isAnswerProvided) && (
                      <button
                        className="button is-primary mt-2"
                        onClick={() => handleSubmit(question.id, answer.id)}
                        disabled={isSubmitting}  // Desabilita o botão enquanto carrega
                      >
                        {isSubmitting ? (
                          <FontAwesomeIcon icon={faSpinner} spin />
                        ) : (
                          'Salvar Resposta'
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default CompanyAnswer;
