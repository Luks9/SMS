import React, { useState, useContext } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { AuthContext } from '../context/AuthContext';
import Message from './Message'; // Certifique-se de que o caminho está correto

const NewForm = ({ categories, fetchForms }) => {
  const { getToken } = useContext(AuthContext);

  const initialFormData = {
    name: '',
    is_active: true, // Sempre true
    categories: [], // IDs das categorias selecionadas
  };

  const [formData, setFormData] = useState(initialFormData);
  const [selectedCategories, setSelectedCategories] = useState([]); // Estado para as categorias selecionadas
  const [message, setMessage] = useState(''); 
  const [messageType, setMessageType] = useState('success');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleCategoriesChange = (selectedOptions) => {
    const selectedCategoryIds = selectedOptions.map(option => option.value);
    setFormData({
      ...formData,
      categories: selectedCategoryIds,
    });
    setSelectedCategories(selectedOptions); // Atualizar as opções selecionadas no estado
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      await axios.post('/api/forms/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFormData(initialFormData);
      fetchForms();
      setSelectedCategories([]); // Limpar as opções selecionadas no Select
      setMessage('Formulário criado com sucesso!');
      setMessageType('success');

    } catch (error) {
      setMessage('Erro ao criar o formulário. Tente novamente.');
      setMessageType('error'); // Define o tipo da mensagem como erro
    }
  };

  return (

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Nome do Formulário</label>
            <div className="control">
              <input
                className="input"
                name="name"
                type="text"
                placeholder="Nome do Formulário"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Categorias</label>
            <div className="control">
              <Select
                isMulti
                name="categories"
                options={categories.map(category => ({ value: category.id, label: category.name }))}
                className="basic-multi-select"
                classNamePrefix="select"
                onChange={handleCategoriesChange}
                value={selectedCategories} // Definir o valor com o estado das categorias selecionadas
              />
            </div>
          </div>

          <div className="field is-grouped">
            <div className="control">
              <button type="submit" className="button is-link">
                Criar Formulário
              </button>
            </div>
          </div>
        </form>

  );
};

export default NewForm;
