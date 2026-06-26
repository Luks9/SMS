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
import {
  RESUMABLE_THRESHOLD_BYTES,
  createUploadControl,
  pauseUpload,
  resumeUpload,
  uploadFileResumable,
} from '../../utils/resumableUpload';

moment.locale('pt-br');

const ActionPlanAnswerForm = () => {
  const { actionPlanId } = useParams();
  const { getToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const { actionPlan, loading } = useFetchPlanActionDetails(actionPlanId);
  const [responseCompany, setResponseCompany] = useState('');
  const [responseChoice, setResponseChoice] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [fileName, setFileName] = useState('Nenhum arquivo selecionado');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [uploadControl, setUploadControl] = useState(null);

  const handleFileChange = (file) => {
    setAttachment(file || null);
    setFileName(file ? file.name : 'Nenhum arquivo selecionado');
  };

  useEffect(() => {
    if (actionPlan) {
      setResponseCompany(actionPlan.response_company || '');
      setResponseChoice(actionPlan.response_choice || '');
    }
  }, [actionPlan]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();

    try {
      if (attachment && attachment.size >= RESUMABLE_THRESHOLD_BYTES) {
        const control = createUploadControl();
        setUploadControl(control);
        setUploadPaused(false);
        setUploadProgress({ percent: 0, etaSeconds: null });

        const uploadResult = await uploadFileResumable({
          file: attachment,
          token,
          companyId: actionPlan?.company,
          actionPlanId,
          fieldSlot: 'action_plan',
          relativePath: `action-plans/${actionPlanId}`,
          uploadControl: control,
          onProgress: ({ percent, etaSeconds }) => {
            setUploadProgress({ percent, etaSeconds });
          },
        });

        await axios.patch(
          `/api/action-plans/${actionPlanId}/`,
          {
            response_company: responseCompany,
            response_choice: responseChoice || '',
            attachment_file_id: uploadResult.file_id,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        const formData = new FormData();
        formData.append('response_company', responseCompany);
        formData.append('response_choice', responseChoice || '');
        if (attachment) {
          formData.append('attachment', attachment);
        }

        await axios.patch(`/api/action-plans/${actionPlanId}/`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setMessage('Resposta e anexo enviados com sucesso!');
      setMessageType('success');
      navigate(`/action-plan/${actionPlanId}/answer`);
    } catch (error) {
      console.error('Erro ao enviar a resposta e anexo:', error);
      setMessage('Erro ao enviar a resposta e anexo.');
      setMessageType('danger');
    }
  };

  const handleRemoteDownload = async () => {
    const token = getToken();
    const downloadResponse = await axios.get(
      `/api/files/${actionPlan.attachment_remote_file_id}/download/?mode=json`,
      
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    window.open(downloadResponse.data.url, '_blank', 'noopener,noreferrer');
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
              Plano de Acao - {moment(actionPlan.created_at || actionPlan.start_date).format('MMMM YYYY')}
            </h1>
            <p><strong>Descricao:</strong> {actionPlan.description}</p>
            <p><strong>Responsavel:</strong> {actionPlan.responsible_name || 'Nao informado'}</p>
            <p><strong>Data de Termino:</strong> {moment(actionPlan.end_date).format('DD/MM/YYYY')}</p>
            <p><strong>Status:</strong> {actionPlan.status}</p>
            {actionPlan.response_choice_display && (
              <p><strong>Classificacao atual:</strong> {actionPlan.response_choice_display}</p>
            )}
            {actionPlan.response_date && (
              <p><strong>Respondido em:</strong> {moment(actionPlan.response_date).format('DD/MM/YYYY')}</p>
            )}

            <hr />

            <h2 className="subtitle">Enviar Resposta da Empresa e Anexo</h2>

            {message && (
              <Message message={message} type={messageType} onClose={() => setMessage('')} />
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Classificacao do Avaliado</label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select value={responseChoice} onChange={(e) => setResponseChoice(e.target.value)}>
                      <option value="">Selecione uma opcao</option>
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

                {(actionPlan.attachment || actionPlan.attachment_remote_file_id) && (
                  <div className="field">
                    {actionPlan.attachment_remote_file_id ? (
                      <button
                        type="button"
                        className="button is-link"
                        onClick={handleRemoteDownload}
                      >
                        <span className="icon"><i className="fas fa-download"></i></span>
                        <span>Download do Anexo</span>
                      </button>
                    ) : (
                      <a href={actionPlan.attachment} className="button is-link" download>
                        <span className="icon"><i className="fas fa-download"></i></span>
                        <span>Download do Anexo</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="file has-name is-fullwidth">
                  <label className="file-label">
                    <input
                      className="file-input"
                      type="file"
                      onChange={(e) => handleFileChange(e.target.files[0])}
                    />
                    <span className="file-cta">
                      <span className="file-icon"><i className="fas fa-upload"></i></span>
                      <span className="file-label">Escolha um arquivo</span>
                    </span>
                    <span className="file-name">{fileName}</span>
                  </label>
                </div>
              </div>

              {uploadProgress && (
                <div className="mb-3">
                  <progress className="progress is-info" value={uploadProgress.percent || 0} max="100">
                    {uploadProgress.percent || 0}%
                  </progress>
                  <small>
                    {uploadProgress.percent || 0}% enviado
                    {typeof uploadProgress.etaSeconds === 'number' ? ` - ETA ${uploadProgress.etaSeconds}s` : ''}
                  </small>
                  {uploadControl && (
                    <div className="mt-2">
                      {uploadPaused ? (
                        <button
                          type="button"
                          className="button is-small"
                          onClick={() => {
                            resumeUpload(uploadControl);
                            setUploadPaused(false);
                          }}
                        >
                          Retomar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button is-small"
                          onClick={() => {
                            pauseUpload(uploadControl);
                            setUploadPaused(true);
                          }}
                        >
                          Pausar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="field">
                <div className="control">
                  <button type="submit" className="button is-primary">Enviar Resposta</button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <p>Plano de Acao nao encontrado.</p>
        )}
      </div>
    </Layout>
  );
};

export default ActionPlanAnswerForm;
