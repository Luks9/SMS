import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { useNavigate, useLocation } from 'react-router-dom';
import Message from '../../components/Message';

const RemForm = ({ companyId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useContext(AuthContext);
  const token = getToken();

  // Determina se está no modo de edição
  const initialData = location.state?.initialData || {};
  const isEditing = !!initialData.id;

  // Inicializa o estado do formulário com dados existentes (edição) ou valores padrão (criação)
  const [formData, setFormData] = useState({
    id: initialData.id || null,
    periodo: initialData.periodo || '',
    empregados: initialData.empregados || 0,
    horas_homem_exposicao: initialData.horas_homem_exposicao || 0,
    fatalidades: initialData.fatalidades || null,
    acidentes_com_afastamento_tipicos: initialData.acidentes_com_afastamento_tipicos || null,
    tratamento_medico: initialData.tratamento_medico || null,
    trabalho_restrito: initialData.trabalho_restrito || null,
    primeiros_socorros: initialData.primeiros_socorros || null,
    dias_perdidos_debitados: initialData.dias_perdidos_debitados || null,
    acidentados_registraveis: initialData.acidentados_registraveis || null,
    acidentes_com_afastamento: initialData.acidentes_com_afastamento || null,
    acidentes_sem_afastamento: initialData.acidentes_sem_afastamento || null,
    acidentes_transito: initialData.acidentes_transito || null,
    outros: initialData.outros || null,
    total_incidentes_registraveis: initialData.total_incidentes_registraveis || null,
    taxa_com_afastamento: initialData.taxa_com_afastamento || null,
    taxa_sem_afastamento: initialData.taxa_sem_afastamento || null,
    incidencia: initialData.incidencia || null,
    gravidade: initialData.gravidade || null,
    lma_nca: initialData.lma_nca || null,
    lma_tfca: initialData.lma_tfca || null,
    funcionarios_demitidos: initialData.funcionarios_demitidos || null,
    diesel_consumido: initialData.consumo_diesel || null,
    company: companyId,
  });

  const [notification, setNotification] = useState({ message: '', type: '' });

  // Atualiza cálculos automáticos ao carregar dados iniciais
  useEffect(() => {
    const updatedFormData = { ...formData };

    // Cálculo de total_incidentes_registraveis
    const k = parseFloat(updatedFormData.acidentados_registraveis) || 0;
    const d = parseFloat(updatedFormData.horas_homem_exposicao) || 0;
    updatedFormData.total_incidentes_registraveis = d > 0 ? ((k * 1000000) / d).toFixed(2) : 0;

    // Cálculo de taxa_com_afastamento
    const f = parseFloat(updatedFormData.acidentes_com_afastamento_tipicos) || 0;
    updatedFormData.taxa_com_afastamento = d > 0 ? ((f * 1000000) / d).toFixed(2) : 0;

    // Cálculo de taxa_sem_afastamento
    const g = parseFloat(updatedFormData.tratamento_medico) || 0;
    const h = parseFloat(updatedFormData.trabalho_restrito) || 0;
    const i = parseFloat(updatedFormData.primeiros_socorros) || 0;
    updatedFormData.taxa_sem_afastamento = d > 0 ? (((g + h + i) * 1000000) / d).toFixed(2) : 0;

    // Cálculo de incidencia
    const c = parseFloat(updatedFormData.empregados) || 0;
    const f2 = parseFloat(updatedFormData.acidentes_com_afastamento) || 0;
    updatedFormData.incidencia = c > 0 ? (((f2 + g + h + i) / c) * 100).toFixed(2) : 0;

    // Cálculo de gravidade
    const j = parseFloat(updatedFormData.dias_perdidos_debitados) || 0;
    updatedFormData.gravidade = d > 0 ? ((j * 1000000) / d).toFixed(2) : 0;

    setFormData(updatedFormData);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value,
    };

    // Cálculos dinâmicos
    if (name === 'acidentados_registraveis' || name === 'horas_homem_exposicao') {
      const k = parseFloat(updatedFormData.acidentados_registraveis) || 0;
      const d = parseFloat(updatedFormData.horas_homem_exposicao) || 0;
      updatedFormData.total_incidentes_registraveis = d > 0 ? ((k * 1000000) / d).toFixed(2) : 0;
    }

    if (name === 'acidentes_com_afastamento_tipicos' || name === 'horas_homem_exposicao') {
      const f = parseFloat(updatedFormData.acidentes_com_afastamento_tipicos) || 0;
      const d = parseFloat(updatedFormData.horas_homem_exposicao) || 0;
      updatedFormData.taxa_com_afastamento = d > 0 ? ((f * 1000000) / d).toFixed(2) : 0;
    }

    if (
      name === 'tratamento_medico' ||
      name === 'trabalho_restrito' ||
      name === 'primeiros_socorros' ||
      name === 'horas_homem_exposicao'
    ) {
      const g = parseFloat(updatedFormData.tratamento_medico) || 0;
      const h = parseFloat(updatedFormData.trabalho_restrito) || 0;
      const i = parseFloat(updatedFormData.primeiros_socorros) || 0;
      const d = parseFloat(updatedFormData.horas_homem_exposicao) || 0;
      updatedFormData.taxa_sem_afastamento = d > 0 ? (((g + h + i) * 1000000) / d).toFixed(2) : 0;
    }

    if (
      name === 'tratamento_medico' ||
      name === 'trabalho_restrito' ||
      name === 'primeiros_socorros' ||
      name === 'empregados' ||
      name === 'acidentes_com_afastamento'
    ) {
      const g = parseFloat(updatedFormData.tratamento_medico) || 0;
      const h = parseFloat(updatedFormData.trabalho_restrito) || 0;
      const i = parseFloat(updatedFormData.primeiros_socorros) || 0;
      const c = parseFloat(updatedFormData.empregados) || 0;
      const f = parseFloat(updatedFormData.acidentes_com_afastamento) || 0;
      updatedFormData.incidencia = c > 0 ? (((f + g + h + i) / c) * 100).toFixed(2) : 0;
    }

    if (name === 'dias_perdidos_debitados' || name === 'horas_homem_exposicao') {
      const j = parseFloat(updatedFormData.dias_perdidos_debitados) || 0;
      const d = parseFloat(updatedFormData.horas_homem_exposicao) || 0;
      updatedFormData.gravidade = d > 0 ? ((j * 1000000) / d).toFixed(2) : 0;
    }

    setFormData(updatedFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validação básica
    if (!formData.periodo) {
      alert('O campo Período é obrigatório.');
      return;
    }
    if (formData.empregados === null || formData.empregados < 0) {
      alert('O campo Colaboradores deve ser um número maior ou igual a 0.');
      return;
    }
    if (formData.horas_homem_exposicao === null || formData.horas_homem_exposicao < 0) {
      alert('O campo Horas Trabalhadas deve ser um número maior ou igual a 0.');
      return;
    }

    const payload = {
      ...formData,
      periodo: formData.periodo ? `${formData.periodo}-01` : '',
    };

    try {
      const url = isEditing
        ? `/api/rems/${formData.id}/update-with-extras/`
        : '/api/rems/create-with-extras/';
      const method = isEditing ? 'patch' : 'post';

      const response = await axios({
        method,
        url,
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201 || response.status === 200) {
        setNotification({
          message: isEditing
            ? 'REM atualizado com sucesso!'
            : 'REM e dados adicionais criados com sucesso!',
          type: 'success',
        });
        setTimeout(() => navigate('/rem-empresa/'), 3000); // Redirect after 3 seconds
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      setNotification({
        message: `Erro ao ${isEditing ? 'atualizar' : 'criar'} REM: ${errorMessage}`,
        type: 'danger',
      });
    }
  };

  const handleCancel = () => {
    navigate('/rem-empresa/');
  };

  // Render logic for loading state
  if (!companyId) {
    return <p>Carregando...</p>;
  }

  return (
    <Layout>
      {/* Notification Message */}
      {notification.message && (
        <Message
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ message: '', type: '' })}
        />
      )}
      <h1 className="title">{isEditing ? 'Editar Relatório Estatístico Mensal' : 'Relatório Estatístico Mensal'}</h1>
      <div className="columns">
        <div className="column is-full">
          <div className="card">
            <div className="card-header">
              <h2 className="card-header-title">Dados Estatísticos</h2>
            </div>
            <div className="card-content">
              <form className="form" onSubmit={handleSubmit}>
                <div className="box">
                  <div className="columns">
                    <div className="column is-one-fifth">
                      <div className="field">
                        <label className="label">Período</label>
                        <div className="control">
                          <input
                            className="input"
                            name="periodo"
                            type="month"
                            value={formData.periodo}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">Colaboradores</label>
                        <div className="control">
                          <input
                            className="input"
                            name="empregados"
                            type="number"
                            value={formData.empregados}
                            onChange={handleChange}
                            min={0}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">Horas Trabalhadas</label>
                        <div className="control">
                          <input
                            className="input"
                            name="horas_homem_exposicao"
                            type="number"
                            value={formData.horas_homem_exposicao}
                            onChange={handleChange}
                            min={0}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="box">
                  <h2 className="subtitle">Acidentes Típicos</h2>
                  <table className="table is-fullwidth is-striped is-bordered">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Fatalidades</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Acidentados com Afastamento</th>
                        <th colSpan={3} className="has-text-centered">Acidentados sem Afastamento</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Dias Perdidos Debitados</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Acidentados Registráveis</th>
                      </tr>
                      <tr>
                        <th>Tratamento Médico</th>
                        <th>Trabalho Restrito</th>
                        <th>Primeiros Socorros</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="fatalidades"
                            value={formData.fatalidades}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="acidentes_com_afastamento_tipicos"
                            value={formData.acidentes_com_afastamento_tipicos}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="tratamento_medico"
                            value={formData.tratamento_medico}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="trabalho_restrito"
                            value={formData.trabalho_restrito}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="primeiros_socorros"
                            value={formData.primeiros_socorros}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="dias_perdidos_debitados"
                            value={formData.dias_perdidos_debitados}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="acidentados_registraveis"
                            value={formData.acidentados_registraveis}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="box">
                  <h2 className="subtitle">Acidentes Pessoais Não Típicos e Taxas</h2>
                  <table className="table is-fullwidth is-striped is-bordered">
                    <thead>
                      <tr>
                        <th colSpan={2} className="has-text-centered">Acidentes de Trajeto</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Acidentes de Trânsito</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Outros</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered" style={{ backgroundColor: '#f0f8ff' }}>Total Incidentes</th>
                        <th colSpan={2} className="has-text-centered is-vcentered" style={{ backgroundColor: '#f0f8ff' }}>Frequência</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered" style={{ backgroundColor: '#f0f8ff' }}>Incidência</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered" style={{ backgroundColor: '#f0f8ff' }}>Gravidade</th>
                      </tr>
                      <tr>
                        <th>Com Afastamento</th>
                        <th>Sem Afastamento</th>
                        <th style={{ backgroundColor: '#f0f8ff' }}>Taxa Com Afastamento</th>
                        <th style={{ backgroundColor: '#f0f8ff' }}>Taxa Sem Afastamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="acidentes_com_afastamento"
                            value={formData.acidentes_com_afastamento}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="acidentes_sem_afastamento"
                            value={formData.acidentes_sem_afastamento}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="acidentes_transito"
                            value={formData.acidentes_transito}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            name="outros"
                            value={formData.outros}
                            onChange={handleChange}
                            min={0}
                          />
                        </td>
                        <td style={{ backgroundColor: '#f0f8ff' }}>
                          <input
                            className="input"
                            type="number"
                            name="total_incidentes_registraveis"
                            value={formData.total_incidentes_registraveis}
                            onChange={handleChange}
                            disabled
                            title="Calculado automaticamente"
                          />
                        </td>
                        <td style={{ backgroundColor: '#f0f8ff' }}>
                          <input
                            className="input"
                            type="number"
                            name="taxa_com_afastamento"
                            value={formData.taxa_com_afastamento}
                            onChange={handleChange}
                            disabled
                            title="Calculado automaticamente"
                          />
                        </td>
                        <td style={{ backgroundColor: '#f0f8ff' }}>
                          <input
                            className="input"
                            type="number"
                            name="taxa_sem_afastamento"
                            value={formData.taxa_sem_afastamento}
                            onChange={handleChange}
                            disabled
                            title="Calculado automaticamente"
                          />
                        </td>
                        <td style={{ backgroundColor: '#f0f8ff' }}>
                          <input
                            className="input"
                            type="number"
                            name="incidencia"
                            value={formData.incidencia}
                            onChange={handleChange}
                            disabled
                            title="Calculado automaticamente"
                          />
                        </td>
                        <td style={{ backgroundColor: '#f0f8ff' }}>
                          <input
                            className="input"
                            type="number"
                            name="gravidade"
                            value={formData.gravidade}
                            onChange={handleChange}
                            disabled
                            title="Calculado automaticamente"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="columns">
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">LMA NCA</label>
                        <div className="control">
                          <input
                            className="input"
                            type="number"
                            name="lma_nca"
                            value={formData.lma_nca}
                            onChange={handleChange}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">LMA TCFA</label>
                        <div className="control">
                          <input
                            className="input"
                            type="number"
                            name="lma_tfca"
                            value={formData.lma_tfca}
                            onChange={handleChange}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="box">
                  <h2 className="subtitle">Informações complementares</h2>
                  <div className="columns">
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">Funcionários Demitidos</label>
                        <div className="control">
                          <input
                            className="input"
                            type="number"
                            name="funcionarios_demitidos"
                            value={formData.funcionarios_demitidos}
                            onChange={handleChange}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="column is-2">
                      <div className="field">
                        <label className="label">Consumo de Diesel (Litros)</label>
                        <div className="control">
                          <input
                            className="input"
                            type="number"
                            name="diesel_consumido"
                            value={formData.diesel_consumido}
                            onChange={handleChange}
                            min={0}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="field is-grouped">
                  <div className="control">
                    <button type="submit" className="button is-primary">
                      {isEditing ? 'Salvar Alterações' : 'Criar REM'}
                    </button>
                  </div>
                  <div className="control">
                    <button type="button" className="button is-light" onClick={handleCancel}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RemForm;