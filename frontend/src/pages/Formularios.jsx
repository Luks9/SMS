import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import Message from '../components/Message';
import QuestionTable from '../components/tables/QuestionTable';

const Formularios = () => {
  const { getToken } = useContext(AuthContext);

  const initialFormData = {
    question: '',
    category: '',
    subcategory: '',
    is_active: true, // Sempre true, não precisa ser alterado
  };

  const [formData, setFormData] = useState(initialFormData);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(''); // Estado para a mensagem
  const [messageType, setMessageType] = useState('success');

  // Função para buscar as perguntas
  const fetchQuestions = async () => {
    try {
      const token = getToken();
      const response = await axios.get('/api/questions/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setQuestions(response.data);
    } catch (error) {
      console.error('Erro ao buscar perguntas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.category){
      fetchSubCategories(formData.category)
    }

  }, [formData.category]);

  const fetchSubCategories = async (id) => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/subcategories/?category=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response.data);
      setSubCategories(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Função assíncrona para buscar as categorias
    const fetchCategories = async () => {
      try {
        const token = getToken();
        const response = await axios.get('/api/categories/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCategories(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        setLoading(false);
      }
    };

    fetchCategories();
    fetchQuestions();
  }, [getToken]);

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

      const response = await axios.post('/api/questions/', dataToSend, {
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
    <Layout>
      <h1 className="title">Formulários</h1>
      {message && (
        <Message
          message={message}
          type={messageType}
          onClose={() => setMessage('')} // Função para fechar a mensagem
        />
      )}
      
        <div className="columns">
          <div className="column is-two-fifths">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Perguntas</p>
              </header>
              <div className="card-content">
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
                    <label className="label">Categoria</label>
                    <div className="control">
                      <div className="select">
                        {loading ? (
                          <p>Carregando categorias...</p>
                        ) : (
                          <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                          >
                            <option selected disabled value="">Selecione uma categoria</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label className="label">Subcategoria</label>
                    <div className="control">
                    <div className="select">
                        {loading ? (
                          <p>Carregando Subcategorias...</p>
                        ) : (
                          <select
                            name="subcategory"
                            value={formData.subcategory}
                            onChange={handleChange}
                          >
                            <option selected disabled value="">Selecione uma categoria</option>
                            {subCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name.length > 35 ? `${category.name.slice(0, 35)}...` : category.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="field is-grouped">
                    <div className="control">
                      <button type="submit" className="button is-link">Salvar</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="column">
            <div className="card">
              <header className="card-header">
                <p className="card-header-title">Perguntas</p>
              </header>
              <div className="card-content">
                <QuestionTable 
                  questions={questions} 
                  loading={loading} 
                  refreshQuestions={fetchQuestions}
                  categories={categories}
                />
              </div>
            </div>
          </div>
        </div>
      
    </Layout>
  );
};

export default Formularios;
