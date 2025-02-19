import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const EditQuestionModal = ({ question, isOpen, onClose, refreshQuestions, categories }) => {
  const { getToken } = useContext(AuthContext);
  const [subCategories, setSubCategories] = useState([]);

  const [formData, setFormData] = useState({});

  const fetchSubCategories = async (id) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/subcategories/?category=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSubCategories(response.data);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  useEffect(() => {
    setFormData({
      question: question.question,
      category: question.category,
      subcategory: question.subcategory,
      is_active: question.is_active,
      recommendation: question.recommendation || ''
    });
    fetchSubCategories(question.category);
  }, [question]);

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
      await axios.put(`/api/questions/${question.id}/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      refreshQuestions(); // Atualiza as perguntas após a edição
      onClose(); // Fecha o modal
    } catch (error) {
      console.error('Erro ao editar a pergunta:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`modal ${isOpen ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-content">
        <div className="box">
          <h1 className="title">Editar Pergunta</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Pergunta</label>
              <div className="control">
                <textarea
                  className="textarea"
                  name="question"
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
                    required
                  >
                    <option value="" disabled>
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
                  <select
                    name="subcategory"
                    value={formData.subcategory}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      Selecione uma subcategoria
                    </option>
                    {subCategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="field is-grouped">
              <div className="control">
                <button type="submit" className="button is-link">
                  Salvar
                </button>
              </div>
              <div className="control">
                <button type="button" className="button is-light" onClick={onClose}>
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <button className="modal-close is-large" aria-label="close" onClick={onClose}></button>
    </div>
  );
};

export default EditQuestionModal;
