import React, { useContext } from 'react';
import Layout from '../components/Layout';
import useFetchCompanyEvaluations from '../hooks/useFetchCompanyEvaluations';
import EvaluationCards from '../components/EvaluationCards';

const EvaluationCompany = () => {
    const companyId = localStorage.getItem("companyId")
    const is_active = true
    const { evaluations, loading, error } = useFetchCompanyEvaluations(companyId, is_active);

    console.log(evaluations)
    return (
        <Layout>
            <h1 className="title">Avaliações</h1>

            <EvaluationCards evaluations={evaluations} />
        </Layout>
    );
    };

export default EvaluationCompany;
