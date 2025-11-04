import React, { useState, useContext, useEffect } from 'react';
import moment from 'moment';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faEdit, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';

const AnswerList = ({ questions, fetchEvaluationDetails }) => {
  const { getToken } = useContext(AuthContext);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [isEditing, setIsEditing] = useState({});
  const [isSubmitting, setIsSubmitting] = useState({}); // Estado de carregamento por questão
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [activeTab, setActiveTab] = useState('');  // Estado para a tab ativa
   
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
    // Inicializa a primeira aba como ativa
    const firstCategory = Object.keys(groupedQuestions)[0];
    setActiveTab(firstCategory);

    // Inicializa o estado de notes, isEditing e selectedAnswers com as respostas existentes
    const initialNotes = {};
    const initialIsEditing = {};
    const initialSelectedAnswers = {};
    questions.forEach(question => {
      const answer = question.answer || {};
      initialNotes[question.id] = answer.note || '';
      initialIsEditing[question.id] = false;
      // Inicializa com a resposta atual do avaliador se existir
      initialSelectedAnswers[question.id] = answer.answer_evaluator || '';
    });
    setNotes(initialNotes);
    setIsEditing(initialIsEditing);
    setSelectedAnswers(initialSelectedAnswers);
  }, [questions]);
  
  const ANSWER_CHOICES_MAP = {
    'NA': { label: 'Não Aplicável', color: 'is-light' },
    'C': { label: 'Conforme', color: 'is-success' },
    'NC': { label: 'Não Conforme', color: 'is-danger' },
    'A': { label: 'Em Análise', color: 'is-warning' },
  };

  const handleSelectChange = (questionId, newValue) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: newValue,
    });
  };

  const handleNoteChange = (questionId, newNote) => {
    setNotes({
      ...notes,
      [questionId]: newNote,
    });
  };

  const toggleEdit = (questionId) => {
    // Ao entrar no modo de edição, preserva a resposta atual do avaliador
    if (!isEditing[questionId]) {
      const question = questions.find(q => q.id === questionId);
      const currentAnswer = question?.answer?.answer_evaluator || '';
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: currentAnswer
      }));
    }
    
    setIsEditing({
      ...isEditing,
      [questionId]: !isEditing[questionId],  // Alterna entre true e false
    });
  };

  const handleSave = async (questionId, answerId) => {
    const selectedAnswer = selectedAnswers[questionId];
    const note = notes[questionId] || '';
    if (!selectedAnswer) {
      alert('Por favor, selecione uma resposta antes de salvar.');
      return;
    }

    setIsSubmitting(prev => ({ ...prev, [questionId]: true })); // Inicia carregamento para esta questão

    try {
      const token = getToken();
      const requestData = {
        answer_evaluator: selectedAnswer,
        date_evaluator: moment().format('YYYY-MM-DD'),
        note: note,
      };
      await axios.patch(`/api/answers/${answerId}/`, requestData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage('Resposta enviada com sucesso!');
      setMessageType('success');
      
      // Recarrega os dados da avaliação para obter as perguntas atualizadas
      try {
        await fetchEvaluationDetails();
        toggleEdit(questionId); // Fecha o modo de edição apenas após o reload bem-sucedido
        // Limpa os campos selecionados após o reload bem-sucedido
        setSelectedAnswers((prev) => ({ ...prev, [questionId]: '' }));
      } catch (fetchError) {
        console.error('Erro ao recarregar dados:', fetchError);
        setMessage('Resposta salva, mas houve um erro ao atualizar a lista. Recarregue a página.');
        setMessageType('warning');
      }
      
    } catch (error) {
      console.error('Erro ao salvar a resposta:', error);
      setMessage('Erro ao salvar a resposta. Por favor, tente novamente.');
      setMessageType('danger');
    } finally {
      setIsSubmitting(prev => ({ ...prev, [questionId]: false })); // Finaliza carregamento
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

    // Cria URL temporária
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    // Verifica se o arquivo é PDF
    const isPDF =
      fileName.toLowerCase().endsWith('.pdf') ||
      response.headers['content-type']?.includes('pdf');

    if (isPDF) {
      // Abre o PDF em nova aba
      window.open(url, '_blank');
    } else {
      // Faz download normalmente
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    // Libera o objeto da memória após um tempo
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Erro ao baixar o arquivo:', error);
  }
};



  return (
    <div>
      {message && (
        <Message
          message={message}
          type={messageType}
          onClose={() => setMessage('')}
        />
      )}
      
      {/* Navegação por Tabs */}
      <div className="tabs is-boxed is-centered">
        <ul>
          {Object.keys(groupedQuestions).map(categoryName => (
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

      {/* Exibição das Perguntas baseadas na Tab ativa */}
      {Object.keys(groupedQuestions).map(categoryName => (
        <div key={categoryName} style={{ display: activeTab === categoryName ? 'block' : 'none' }}>
          {groupedQuestions[categoryName].map((question) => {
            const answer = question.answer || {};
            const isAnswerProvided = answer.answer_respondent !== 'Aguardando resposta';
            return (
              <div key={question.id} className="box">
                <div className="columns is-mobile is-vcentered">
                  <div className="column is-half">
                    <h1 className="subtitle is-5">{question.subcategory_name}</h1>
                    <p><h2 className="subtitle is-6">Q{question.id} - {question.question}</h2></p>
                    <p><strong>Resposta da empresa: </strong> 
                      <span className={`tag ${ANSWER_CHOICES_MAP[answer.answer_respondent]?.color || 'is-light'}`}>
                        {ANSWER_CHOICES_MAP[answer.answer_respondent]?.label || 'Aguardando resposta'}
                      </span>
                    </p>
                    {answer.attachment_respondent ? (
                    <button
                        onClick={() => handleDownload(answer.id, answer.attachment_respondent.split('/').pop())}
                    >
                        <FontAwesomeIcon icon={faFileDownload} /> Baixar Anexo
                    </button>
                    ) : (
                    <p><em>Sem anexo</em></p>
                    )}
                    {answer.date_respondent && (
                      <p><em>Respondido em: {moment(answer.date_respondent).format('DD/MM/YYYY')}</em></p>
                    )}
                  </div>
                  <div className="column is-half">
                    <div className="is-pulled-right">
                      {isAnswerProvided && (
                        <FontAwesomeIcon
                          icon={isEditing[question.id] ? faTimes : faEdit}
                          className="is-clickable"
                          onClick={() => toggleEdit(question.id)}
                        />
                      )}
                    </div>
                    {isAnswerProvided && !isEditing[question.id] ? (
                      <>
                        <p><strong>Resposta do Avaliador: </strong> 
                          <span className={`tag ${ANSWER_CHOICES_MAP[answer.answer_evaluator]?.color || 'is-light'}`}>
                            {ANSWER_CHOICES_MAP[answer.answer_evaluator]?.label || 'Não respondido'}
                          </span>
                        </p>
                        {answer.attachment_evaluator ? (
                          <p>
                            <a href={answer.attachment_evaluator} target="_blank" rel="noopener noreferrer">
                              <FontAwesomeIcon icon={faFileDownload} /> Ver Anexo
                            </a>
                          </p>
                        ) : (
                          <p><em>Sem anexo</em></p>
                        )}
                        {answer.date_evaluator && (
                          <p><em>Respondido em: {moment(answer.date_evaluator).format('DD/MM/YYYY')}</em></p>
                        )}
                        {answer.note && (
                          <div className="content">
                            <p><strong>Nota:</strong> {answer.note}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p><strong>Responder:</strong></p>
                        <div className="select is-fullwidth">
                          <select
                            onChange={(e) => handleSelectChange(question.id, e.target.value)}
                            value={selectedAnswers[question.id] || answer.answer_evaluator || ''}
                          >
                            <option value="" disabled>Selecione uma resposta</option>
                            {Object.entries(ANSWER_CHOICES_MAP).map(([value, { label }]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field mt-2">
                          <label className="label">Nota</label>
                          <div className="control">
                            <textarea
                              className="textarea"
                              placeholder="Adicione uma nota (opcional)"
                              rows="2"
                              value={notes[question.id] || ''}
                              onChange={(e) => handleNoteChange(question.id, e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                        {answer.id && (
                          <button
                            className="button is-primary mt-2"
                            onClick={() => handleSave(question.id, answer.id)}
                            disabled={isSubmitting[question.id]} // Desabilita durante carregamento
                          >
                            {isSubmitting[question.id] ? (
                              <FontAwesomeIcon icon={faSpinner} spin />
                            ) : (
                              'Salvar'
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default AnswerList;
