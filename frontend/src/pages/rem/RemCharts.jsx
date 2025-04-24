import React, { useState, useMemo, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import Select from 'react-select';

// Registrar os componentes necessários do Chart.js
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const RemCharts = ({ data }) => {
  // Extrair empresas únicas dos dados usando useMemo para otimização
  const companyOptions = useMemo(() => {
    return [
      ...new Set(data.map(item => item.rem?.company_name || 'Empresa Desconhecida'))
    ].map(name => ({
      value: name,
      label: name,
    }));
  }, [data]);

  // Estado para empresas selecionadas, inicializando vazio
  const [selectedCompanies, setSelectedCompanies] = useState([]);

  // Atualizar empresas selecionadas após o cálculo de companyOptions
  useEffect(() => {
    setSelectedCompanies(companyOptions.slice(0, 5));
  }, [companyOptions]);

  // Filtrar dados com base nas empresas selecionadas
  const filteredData = selectedCompanies.length > 0
    ? data.filter(item => selectedCompanies.some(company => company.value === (item.rem?.company_name || 'Empresa Desconhecida')))
    : data;

  // Processar dados para os gráficos
  const companies = filteredData.map(item => item.rem?.company_name || 'Empresa Desconhecida');
  const taxaComAfastamento = filteredData.map(item => item.rem.taxa_com_afastamento || 0);
  const taxaSemAfastamento = filteredData.map(item => item.rem.taxa_sem_afastamento || 0);
  const funcionarios_demitidos = filteredData.map(item => item.funcionarios_demitidos || 0);

  // Dados para o gráfico de barras (Taxas de Acidentes)
  const barData = {
    labels: companies,
    datasets: [
      {
        label: 'Taxa com Afastamento',
        data: taxaComAfastamento,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Taxa sem Afastamento',
        data: taxaSemAfastamento,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Opções para o gráfico de barras
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Taxas de Acidentes por Empresa',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Taxa',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Empresa',
        },
      },
    },
  };

  // Dados para o gráfico de rosca (Consumo de Diesel)
  const doughnutData = {
    labels: companies,
    datasets: [
      {
        label: 'Demissões',
        data: funcionarios_demitidos,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Opções para o gráfico de rosca
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Consumo de Diesel por Empresa',
      },
    },
  };

  return (
    <div>
      <div className="field">
        <label className="label">Selecionar Empresas</label>
        <div className="control">
          <Select
            isMulti
            options={companyOptions}
            value={selectedCompanies}
            onChange={setSelectedCompanies}
            placeholder="Selecione as empresas..."
            classNamePrefix="react-select"
          />
        </div>
      </div>
      <div className="columns">
        <div className="column is-half">
          <div className="box" style={{ height: '400px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
        <div className="column is-half">
          <div className="box" style={{ height: '400px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemCharts;