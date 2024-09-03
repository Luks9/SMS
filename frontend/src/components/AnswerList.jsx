import React, { useState, useContext, useEffect } from 'react';
import moment from 'moment';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileDownload, faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import Message from './Message';

const AnswerList = ({ questions, fetchEvaluationDetails }) => {
  const { getToken } = useContext(AuthContext);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [isEditing, setIsEditing] = useState({});
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

    // Inicializa o estado de notes e isEditing com as respostas existentes
    const initialNotes = {};
    const initialIsEditing = {};
    questions.forEach(question => {
      const answer = question.answer || {};  // Garantir que `answer` sempre seja um objeto
      initialNotes[question.id] = answer.note || '';
      initialIsEditing[question.id] = false;  // Inicia com false (não está em edição)
    });
    setNotes(initialNotes);
    setIsEditing(initialIsEditing);
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
    setIsEditing({
      ...isEditing,
      [questionId]: !isEditing[questionId],  // Alterna entre true e false
    });
  };

  const handleSave = async (questionId, answerId) => {
    const selectedAnswer = selectedAnswers[questionId];
    const note = notes[questionId] || '';  // Note pode ser vazio se não houver texto
    if (!selectedAnswer) {
      alert('Por favor, selecione uma resposta antes de salvar.');
      return;
    }

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
      toggleEdit(questionId);  // Fecha o modo de edição após salvar
    } catch (error) {
      console.error('Erro ao salvar a resposta:', error);
      setMessage('Erro ao salvar a resposta. Por favor, tente novamente.');
      setMessageType('danger');
    }
    fetchEvaluationDetails();  // Recarrega os dados após salvar
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
      <div className="tabs is-boxed">
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
                    <h2 className="subtitle is-6">{question.question}</h2>
                    <p><strong>Resposta da empresa: </strong> 
                      <span className={`tag ${ANSWER_CHOICES_MAP[answer.answer_respondent]?.color || 'is-light'}`}>
                        {ANSWER_CHOICES_MAP[answer.answer_respondent]?.label || 'Aguardando resposta'}
                      </span>
                    </p>
                    {answer.attachment_respondent ? (
                      <p>
                        <a href={answer.attachment_respondent} target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faFileDownload} /> Ver Anexo
                        </a>
                      </p>
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
                            value={selectedAnswers[question.id] || ''}
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
                          >
                            Salvar
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
