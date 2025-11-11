import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; 
import axios from 'axios';
import Layout from '../../components/Layout';
import { AuthContext } from '../../context/AuthContext';
import moment from 'moment';
import 'moment/locale/pt-br';
import Message from '../../components/Message';
import useFetchPlanActionDetails from '../../hooks/useFetchPlanActionDetails';
import { ANSWER_CHOICES } from '../../utils/AnswerChoices';

moment.locale('pt-br');

const ActionPlanAnswerForm = () => {
    const { actionPlanId } = useParams(); // Pega o ID do plano de ação da URL
    const { getToken } = useContext(AuthContext); // Para obter o token de autenticação
    const navigate = useNavigate();
    const { actionPlan , loading} = useFetchPlanActionDetails(actionPlanId); // Estado para guardar o plano de ação
    const [responseCompany, setResponseCompany] = useState(''); // Estado para o campo response_company
    const [responseChoice, setResponseChoice] = useState('');
    const [attachment, setAttachment] = useState(null); // Estado para o anexo
    const [fileName, setFileName] = useState('Nenhum arquivo selecionado'); // Estado para o nome do arquivo
    const [message, setMessage] = useState(''); // Estado da mensagem
    const [messageType, setMessageType] = useState(''); // Estado do tipo de mensagem
  
   
    // Função para lidar com a mudança do arquivo selecionado
    const handleFileChange = (file) => {
      setAttachment(file || null);
      setFileName(file ? file.name : 'Nenhum arquivo selecionado'); // Atualiza o nome do arquivo
    };

    useEffect(() => {
      if (actionPlan) {
        setResponseCompany(actionPlan.response_company || '');
        setResponseChoice(actionPlan.response_choice || '');
      }
    }, [actionPlan]);
  
    // Função para lidar com a submissão do formulário
    const handleSubmit = async (e) => {
      e.preventDefault();
      const token = getToken();
      const formData = new FormData(); // Usamos FormData para enviar arquivos
      formData.append('response_company', responseCompany);
      formData.append('response_choice', responseChoice || '');
      if (attachment) {
        formData.append('attachment', attachment); // Adiciona o arquivo apenas se for selecionado
      }
  
      try {
        await axios.patch(`/api/action-plans/${actionPlanId}/`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data', // Necessário para envio de arquivos
          },
        });
        setMessage('Resposta e anexo enviados com sucesso!');
        setMessageType('success');
        // Opcional: redireciona para a página de visualização após sucesso
        navigate(`/action-plan/${actionPlanId}/answer`);
      } catch (error) {
        console.error('Erro ao enviar a resposta e anexo:', error);
        setMessage('Erro ao enviar a resposta e anexo.');
        setMessageType('danger');
      }
    };
  
    // Função para fechar a mensagem
    const handleCloseMessage = () => {
      setMessage('');
    };
  
    if (loading) {
      return <p>Carregando...</p>;
    }
  
    return (
      <Layout>
        <div className="box">
          {actionPlan ? (
            <>
              <h1 className="title">
                Plano de Ação - {moment(actionPlan.created_at || actionPlan.start_date).format('MMMM YYYY')}
              </h1>
              <p><strong>Descrição:</strong> {actionPlan.description}</p>
              <p><strong>Responsável:</strong> {actionPlan.responsible_name || 'Não informado'}</p>
              <p><strong>Data de Término:</strong> {moment(actionPlan.end_date).format('DD/MM/YYYY')}</p>
              <p><strong>Status:</strong> {actionPlan.status}</p>
              {actionPlan.response_choice_display && (
                <p><strong>Classificação atual:</strong> {actionPlan.response_choice_display}</p>
              )}
              {actionPlan.response_date && (
                <p><strong>Respondido em:</strong> {moment(actionPlan.response_date).format('DD/MM/YYYY')}</p>
              )}
              
              <hr />
  
              <h2 className="subtitle">Enviar Resposta da Empresa e Anexo</h2>
  
              {message && (
                <Message message={message} type={messageType} onClose={handleCloseMessage} />
              )}
  
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Classificação do Avaliado</label>
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select
                        value={responseChoice}
                        onChange={(e) => setResponseChoice(e.target.value)}
                      >
                        <option value="">Selecione uma opção</option>
                        {ANSWER_CHOICES.map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Resposta da Empresa</label>
                  <div className="control">
                    <textarea
                      className="textarea"
                      value={responseCompany}
                      onChange={(e) => setResponseCompany(e.target.value)}
                      rows="4"
                      required
                    />
                  </div>
                </div>
  
                <div className="field">
                  <label className="label">Anexo (opcional)</label>
                  
                  {/* Se já houver um anexo, exibe um link para download */}
                  {actionPlan.attachment && (
                    <div className="field">
                      <a
                        href={actionPlan.attachment} // Link do anexo para download
                        className="button is-link"
                        download
                      >
                        <span className="icon">
                          <i className="fas fa-download"></i>
                        </span>
                        <span>Download do Anexo</span>
                      </a>
                    </div>
                  )}
  
                  {/* Campo para upload de novo anexo */}
                  <div className="file has-name is-fullwidth">
                    <label className="file-label">
                      <input
                        className="file-input"
                        type="file"
                        onChange={(e) => handleFileChange(e.target.files[0])} // Atualiza o arquivo selecionado
                      />
                      <span className="file-cta">
                        <span className="file-icon">
                          <i className="fas fa-upload"></i>
                        </span>
                        <span className="file-label">Escolha um arquivo</span>
                      </span>
                      <span className="file-name">
                        {fileName}
                      </span>
                    </label>
                  </div>
                </div>
  
                <div className="field">
                  <div className="control">
                    <button type="submit" className="button is-primary">Enviar Resposta</button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <p>Plano de Ação não encontrado.</p>
          )}
        </div>
      </Layout>
    );
  };
  
  export default ActionPlanAnswerForm;
