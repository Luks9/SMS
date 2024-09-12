// src/components/QuestionForm.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Message from './Message';
import { AuthContext } from '../context/AuthContext';

const QuestionForm = ({ categories, fetchQuestions }) => {
  const { getToken } = useContext(AuthContext);

  const initialFormData = {
    question: '',
    recommendation: '',
    category: '',
    subcategory: '',
    is_active: true, // Sempre true, não precisa ser alterado
  };

  const [formData, setFormData] = useState(initialFormData);
  const [subCategories, setSubCategories] = useState([]);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [message, setMessage] = useState(''); // Estado para a mensagem
  const [messageType, setMessageType] = useState('success');

  const fetchSubCategories = async (id) => {
    setLoadingSubCategories(true);
    try {
      const token = getToken();
      const response = await axios.get(`/api/subcategories/?category=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar subcategorias:', error);
    } finally {
      setLoadingSubCategories(false);
    }
  };

  useEffect(() => {
    if (formData.category) {
      fetchSubCategories(formData.category);
    }
  }, [formData.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      const dataToSend = {
        ...formData,
        is_active: true, // Sempre enviando como true
      };

      await axios.post('/api/questions/', dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFormData(initialFormData);
      fetchQuestions();
      setMessage('Pergunta salva com sucesso!');
      setMessageType('success');
    } catch (error) {
      setMessage('Erro ao salvar a pergunta. Tente novamente.');
      setMessageType('error'); // Define o tipo da mensagem como erro
    }
  };

  return (
    <div className="card">
      <header className="card-header">
        <p className="card-header-title">Criar Perguntas</p>
      </header>
      <div className="card-content">
        {message && (
          <Message
            message={message}
            type={messageType}
            onClose={() => setMessage('')} // Função para fechar a mensagem
          />
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Pergunta</label>
            <div className="control">
              <textarea
                className="textarea"
                name="question"
                type="text"
                placeholder="Pergunta"
                value={formData.question}
                onChange={handleChange}
                rows="2"
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Recomendação</label>
            <div className="control">
              <textarea
                className="textarea"
                name="recommendation"
                type="text"
                placeholder="Recomendação"
                value={formData.recommendation}
                onChange={handleChange}
                rows="2"
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="label">Categoria</label>
            <div className="control">
              <div className="select">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option disabled value="">
                    Selecione uma categoria
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label">Subcategoria</label>
            <div className="control">
              <div className="select">
                {loadingSubCategories ? (
                  <p>Carregando Subcategorias...</p>
                ) : (
                  <select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleChange}
                  >
                    <option disabled value="">
                      Selecione uma subcategoria
                    </option>
                    {subCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name.length > 35
                          ? `${category.name.slice(0, 35)}...`
                          : category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="field is-grouped">
            <div className="control">
              <button type="submit" className="button is-link">
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionForm;
