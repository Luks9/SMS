import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import moment from 'moment';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import useFetchCompanyQuestions from '../hooks/useFetchCompanyQuestions';  // Importa o hook


const CompanyAnswer = () => {
  const { id } = useParams();  // Pega o ID da avaliação da URL
  const { questions, loading, error, valid_until, fetchQuestions } = useFetchCompanyQuestions(id); // Usa o hook para buscar perguntas
  const { getToken } = useContext(AuthContext);  // Pega o token de autenticação do contexto
  const [selectedAnswers, setSelectedAnswers] = useState({});  // Armazena as respostas da empresa
  const [selectedFiles, setSelectedFiles] = useState({});  // Armazena os arquivos anexados
  const [fileNames, setFileNames] = useState({});  // Armazena os nomes dos arquivos selecionados
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('');  // Aba ativa
  const [isEditing, setIsEditing] = useState({});

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


  // Função para lidar com a mudança na resposta selecionada
  const handleSelectChange = (questionId, newValue) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: newValue,
    });
  };

  // Função para lidar com o upload de arquivos
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
    try {
      const token = getToken();
      const formData = new FormData();
  
      const selectedAnswer = selectedAnswers[questionId];
      const selectedFile = selectedFiles[questionId];
      const company = localStorage.getItem('companyId');
  
      // Adiciona a resposta selecionada e a data
      formData.append('answer_respondent', selectedAnswer || '');
      formData.append('date_respondent', moment().format('YYYY-MM-DD'));
  
      // Adiciona o anexo se houver
      if (selectedFile) {
        formData.append('attachment_respondent', selectedFile);
      }
  
      // Se estivermos criando, precisamos adicionar esses campos
      if (!answerId) {
        formData.append('question', questionId);
        formData.append('evaluation', id); // 'id' obtido de useParams
        formData.append('company', company);
      }
  
      // Determina o método de envio: POST (criação) ou PATCH (edição)
      const url = answerId
        ? `/api/answers/${answerId}/` // URL para editar resposta existente
        : '/api/answers/';           // URL para criar nova resposta
  
      const method = answerId ? 'patch' : 'post';
  
      // Envia a requisição POST ou PATCH com os dados
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
  
      // Atualiza as perguntas para refletir a nova ou atualizada resposta
      fetchQuestions();
  
      // Limpa os campos de resposta e arquivo
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: '' }));
      setSelectedFiles((prev) => ({ ...prev, [questionId]: null }));
      setFileNames((prev) => ({ ...prev, [questionId]: '' }));
  
      // Fecha o modo de edição após salvar ou criar
      toggleEdit(questionId);
  
    } catch (error) {
      console.error('Erro ao salvar a resposta:', error);
      setMessage('Erro ao salvar a resposta. Por favor, tente novamente.');
      setMessageType('danger');
    }
  };
  


  // Função para download de arquivo
  const handleDownload = async (answerId, fileName) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/download/attachment_respondent/${answerId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',  // Garante que o arquivo seja tratado corretamente
      });

      // Cria uma URL para o arquivo baixado
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);  // Define o nome do arquivo
      document.body.appendChild(link);
      link.click();

      // Limpa o URL temporário
      window.URL.revokeObjectURL(url);
      link.remove();
    } catch (error) {
      console.error('Erro ao baixar o arquivo:', error);
    }
  };

  // Função para alternar o estado de edição
  const toggleEdit = (questionId) => {
    setIsEditing({
      ...isEditing,
      [questionId]: !isEditing[questionId],  // Alterna entre true e false
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

      {/* Tabs para as categorias */}
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

      {/* Exibição das perguntas da categoria ativa */}
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
                const isAnswerProvided = !!answer.answer_respondent; // Verifica se a resposta já foi dada
                return (
                  <div key={question.id} className="box">
                    <div className="columns is-vcentered">
                      <div className="column">
                        <h2 className="subtitle">{question.question}</h2>
                        <p className="mb-4">{question.recommendation}</p>
                      </div>

                      {/* Ícone de edição somente se houver uma resposta */}
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

                    {/* Exibe a resposta se já tiver sido fornecida e não estiver em modo de edição */}
                    {isAnswerProvided && !isEditing[question.id] ? (
                      <div className="columns">
                        <div className="column is-one-third">
                          <p><strong>Resposta da empresa: </strong> 
                            <span className={`tag ${ANSWER_CHOICES_MAP[answer.answer_respondent]?.color || 'is-light'}`}>
                              {ANSWER_CHOICES_MAP[answer.answer_respondent]?.label || 'Aguardando resposta'}
                            </span>
                          </p>
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
                      // Exibe os campos de seleção de resposta e upload de arquivo se a pergunta não tiver resposta ou estiver em modo de edição
                      <div className="columns">
                        <div className="column is-one-third">
                          <div className="field">
                            <label className="label">Resposta:</label>
                            <div className="control">
                              <div className="select is-fullwidth">
                              <select
                                onChange={(e) => handleSelectChange(question.id, e.target.value)}
                                value={
                                  isEditing[question.id] 
                                    ? selectedAnswers[question.id] || answer.answer_respondent || '' // Se estiver editando, pega a resposta selecionada ou a resposta existente
                                    : ''  // Se não estiver editando, deixa vazio
                                  }
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

                    {/* Exibe o botão de salvar apenas se estiver em modo de edição ou se não houver resposta */}
                    {(isEditing[question.id] || !isAnswerProvided) && (
                      <button
                        className="button is-primary mt-2"
                        onClick={() => handleSubmit(question.id,  answer.id )}
                      >
                        Salvar Resposta
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
