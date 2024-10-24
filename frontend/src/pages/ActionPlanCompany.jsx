import React from 'react';
import Layout from '../components/Layout';
import useFetchPlanActionsCompany from '../hooks/useFetchPlanActionsCompany';
import ActionPlanCards from '../components/action_plan/ActionPlanCards'; // Importe o componente criado

const ActionPlanCompany = () => {
    const companyId = localStorage.getItem("companyId");
    const { actionsPlans } = useFetchPlanActionsCompany(companyId); // Certifique-se de que a chave seja 'actionPlans'

    return(
        <Layout>
            <h1 className="title">Planos de Ação</h1>
            <ActionPlanCards actionsPlans={actionsPlans} /> {/* Exibe os cartões dos planos de ação */}
        </Layout>
    );
};

export default ActionPlanCompany;
