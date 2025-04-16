import React, { useState } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Layout from '../../components/Layout';

const RemForm = ({companyId}) => {
    

    const [formData, setFormData] = useState({
        periodo: '',
        empregados: '',
        horas_homem_exposicao: '',
        fatalidades: '',
        acidentes_com_afastamento_tipicos: '',
        tratamento_medico: '',
        trabalho_restrito: '',
        primeiros_socorros: '',
        dias_perdidos_debitados: '',
        acidentados_registraveis: '',
        acidentes_com_afastamento: '',
        acidentes_sem_afastamento: '',
        acidentes_transito: '',
        outros: '',
        total_incidentes_registraveis: '',
        taxa_com_afastamento: '',
        taxa_sem_afastamento: '',
        incidencia: '',
        gravidade: '',
        lma_nca: '',
        lma_tfca: '',
        company: companyId,
        empregados: 0,
        horas_homem_exposicao: 0,
    });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <Layout>
      <h1 className="title">Relatório Estatístico Mensal</h1>
      <div className="columns">
        <div className="column is-full">
          <div className="card">
            <div className="card-header">
              <h2 className="card-header-title">Dados Estatísticos</h2>
            </div>
            <div className="card-content">
            <form className="form">
              <div className="columns">
                <div className="column is-one-fifth">
                  <div className="field">
                    <label className="label">Pergunta</label>
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
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="acidentesComAfastamento"
                          value={formData.acidentesComAfastamento}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="tratamentoMedico"
                          value={formData.tratamentoMedico}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="trabalhoRestrito"
                          value={formData.trabalhoRestrito}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="primeirosSocorros"
                          value={formData.primeirosSocorros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="diasPerdidosDebitados"
                          value={formData.diasPerdidosDebitados}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="acidentadosRegistraveis"
                          value={formData.acidentadosRegistraveis}
                          onChange={handleChange}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                <h2 className="subtitle">Acidentes Pessoais Não Típicos e Taxas</h2>

                <table className="table is-fullwidth is-striped is-bordered">
                  <thead>
                    <tr>
                        <th colSpan={2} className="has-text-centered">Acidentes de Trajeto</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Acidentes de Trânsito</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Outros</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Total Incidentes</th>
                        <th colSpan={2} className="has-text-centered is-vcentered">Frequência</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Incidência</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered">Gravidade</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered" style={{ width: '10%' }}>LMA NCA</th>
                        <th rowSpan={2} className="has-text-centered is-vcentered" style={{ width: '10%' }}>LMA TFCA</th>
                    </tr>
                    <tr>
                      <th>Com Afastamento</th>
                      <th>Sem Afastamento</th>
                      <th>Taxa Com Afastamento</th>
                      <th>Taxa Sem Afastamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="acidentesDeTrajetoComAfastamento"
                          value={formData.acidentesDeTrajetoComAfastamento}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="acidentesDeTrajetoSemAfastamento"
                          value={formData.acidentesDeTrajetoSemAfastamento}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="acidentesTransito"
                          value={formData.acidentesTransito}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="outros"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="total_incidentes_registraveis"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="taxa_com_afastamento"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="taxa_sem_afastamento"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="incidencia"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          name="gravidade"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="lma_nca"
                          name="gravidade"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="lma_tfca"
                          name="gravidade"
                          value={formData.outros}
                          onChange={handleChange}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RemForm;
