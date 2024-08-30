// src/pages/Formularios.jsx
import React from 'react';
import Layout from '../components/Layout';
import QuestionTable from '../components/tables/QuestionTable';
import QuestionForm from '../components/QuestionForm';
import FormTable from '../components/tables/FormTable';
import NewForm from '../components/NewForm';
import useFetchQuestionsAndCategories from '../hooks/useFetchQuestionsAndCategories';
import useFetchForms from '../hooks/useFetchForms'

const Formularios = () => {
  const { categories, questions, loading, fetchQuestions } = useFetchQuestionsAndCategories();
  const {forms, fetchForms} = useFetchForms();


  return (
    <Layout>
      <h1 className="title">Formulários</h1>
      <div className="columns">
        <div className="column">
          <div 
            className="card"
            style={{
              height: '430px', 
              display: 'flex', 
              flexDirection: 'column'
            }}
            >
            <header className="card-header">
              <p className="card-header-title">Criar Fomulário</p>
            </header>
            <div className="card-content">
              <NewForm categories={categories} refreshForms={fetchForms} />
            </div>
          </div>
        </div>
        <div className="column">
          <div 
           className="card" 
           style={{
             height: '430px', 
             display: 'flex', 
             flexDirection: 'column'
           }}
          >
            <header className="card-header">
              <p className="card-header-title">Fomulários</p>
            </header>
            <div className="card-content">
              <FormTable forms={forms} loading={loading} refreshForms={fetchForms} />
            </div>
          </div>
        </div>
      </div>
      <div className="columns">
        <div className="column is-two-fifths">
          <QuestionForm categories={categories} fetchQuestions={fetchQuestions} />
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
