import React from 'react';
import Layout from '../components/Layout';
import useFetchCompanyEvaluations from '../hooks/useFetchCompanyEvaluations';
import EvaluationCards from '../components/EvaluationCards';

const EvaluationCompany = () => {
    const companyId = localStorage.getItem("companyId")
    const is_active = true
    const { evaluations } = useFetchCompanyEvaluations(companyId, is_active);

    return (
        <Layout>
            <h1 className="title">Avaliações</h1>

            <EvaluationCards evaluations={evaluations} />
        </Layout>
    );
    };

export default EvaluationCompany;
