import React, { useState, useMemo, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineController } from 'chart.js';
import Select from 'react-select';
import moment from 'moment';

ChartJS.register(BarElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineController);

const RemCharts = ({ data }) => {
  const companyOptions = useMemo(() => {
    return [
      ...new Set(data.map(item => item.rem?.company_name || 'Empresa Desconhecida'))
    ].map(name => ({
      value: name,
      label: name,
    }));
  }, [data]);

  const periodOptions = useMemo(() => {
    const periods = [
      ...new Set(
        data
          .filter(item => item.rem?.periodo && moment(item.rem.periodo, 'YYYY-MM-DD', true).isValid())
          .map(item => moment(item.rem.periodo, 'YYYY-MM-DD').format('MM-YYYY'))
      )
    ].map(period => ({
      value: period,
      label: period,
    }));
    return periods.sort((a, b) => {
      const [monthA, yearA] = a.value.split('-').map(Number);
      const [monthB, yearB] = b.value.split('-').map(Number);
      return yearB * 12 + monthB - (yearA * 12 + monthA);
    });
  }, [data]);

  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  useEffect(() => {
    setSelectedCompanies(companyOptions.slice(0, 5));
    if (periodOptions.length > 0) {
      setSelectedPeriod(periodOptions[0]);
    }
  }, [companyOptions, periodOptions]);

  const filteredData = useMemo(() => {
    let result = data;

    if (selectedCompanies.length > 0) {
      result = result.filter(item =>
        selectedCompanies.some(company => company.value === (item.rem?.company_name || 'Empresa Desconhecida'))
      );
    }

    if (selectedPeriod) {
      const [month, year] = selectedPeriod.value.split('-').map(Number);
      result = result.filter(item => {
        if (!item.rem?.periodo || !moment(item.rem.periodo, 'YYYY-MM-DD', true).isValid()) return false;
        const date = moment(item.rem.periodo, 'YYYY-MM-DD');
        return date.month() + 1 === month && date.year() === year;
      });
    }

    return result;
  }, [data, selectedCompanies, selectedPeriod]);

  const companies = filteredData.map(item => item.rem?.company_name || 'Empresa Desconhecida');
  const empregados = filteredData.map(item => Number(item.rem.empregados) || 0);
  const horasHomemExposicao = filteredData.map(item => Number(item.rem.horas_homem_exposicao) || 0);
  const intensidadeTrabalho = filteredData.map(item =>
    item.rem.empregados > 0
      ? Number(item.rem.horas_homem_exposicao) / Number(item.rem.empregados)
      : 0
  );

  const barData = {
    labels: companies,
    datasets: [
      {
        label: 'Total de Empregados',
        data: empregados,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Horas-Homem de Exposição',
        data: horasHomemExposicao,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y1',
      },
      {
        type: 'line',
        label: 'Intensidade do Trabalho (Horas por Empregado)',
        data: intensidadeTrabalho,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y2',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Empregados, Horas-Homem e Intensidade do Trabalho por Empresa' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Total de Empregados' },
        position: 'left',
      },
      y1: {
        beginAtZero: true,
        title: { display: true, text: 'Horas-Homem de Exposição' },
        position: 'right',
        grid: { drawOnChartArea: false },
      },
      y2: {
        beginAtZero: true,
        title: { display: true, text: 'Horas por Empregado' },
        position: 'right',
        grid: { drawOnChartArea: false },
        offset: true, // Evitar sobreposição com y1
      },
      x: {
        title: { display: true, text: 'Empresa' },
      },
    },
  };

  return (
    <div className="box">
      <div className="columns mb-5">
        <div className="column is-6">
          <div className="field">
            <label className="label">Selecionar Período (Mês-Ano)</label>
            <div className="control">
              <Select
                options={periodOptions}
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                placeholder="Selecione o período..."
                classNamePrefix="react-select"
                isClearable
              />
            </div>
          </div>
        </div>
        <div className="column is-6">
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
        </div>
      </div>
      <div className="columns is-multiline">
        <div className="column is-12">
          <div className="box" style={{ height: '400px' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemCharts;