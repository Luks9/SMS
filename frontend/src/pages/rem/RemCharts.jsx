import React, { useState, useMemo, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineController } from 'chart.js';
import Select from 'react-select';
import moment from 'moment';
import { 
  getRiskLevel, 
  getChartColor, 
  formatSafetyRate, 
  RISK_THRESHOLDS 
} from '../../utils/safetyMetrics';

ChartJS.register(BarElement, LineElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineController);

const RemCharts = ({ data }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [viewMode, setViewMode] = useState('comparison'); // 'comparison' or 'trend'

  // Extract unique companies
  const companyOptions = useMemo(() => {
    return [
      ...new Set(data.map(item => item.rem?.company_name || 'Empresa Desconhecida'))
    ].sort().map(name => ({
      value: name,
      label: name,
    }));
  }, [data]);

  // Extract unique periods
  const periodOptions = useMemo(() => {
    const periods = [
      ...new Set(
        data
          .filter(item => item.rem?.periodo && moment(item.rem.periodo, 'YYYY-MM-DD', true).isValid())
          .map(item => moment(item.rem.periodo, 'YYYY-MM-DD').format('YYYY-MM'))
      )
    ].map(period => ({
      value: period,
      label: moment(period, 'YYYY-MM').format('MM/YYYY'),
    }));
    return periods.sort((a, b) => moment(b.value).diff(moment(a.value)));
  }, [data]);

  // Initialize with most recent period and top 5 companies
  useEffect(() => {
    if (periodOptions.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periodOptions[0]);
    }
    if (companyOptions.length > 0 && selectedCompanies.length === 0) {
      setSelectedCompanies(companyOptions.slice(0, 5));
    }
  }, [periodOptions, companyOptions, selectedPeriod, selectedCompanies]);

  // Filter data by selected period
  const currentPeriodData = useMemo(() => {
    if (!selectedPeriod) return [];
    
    return data.filter(item => {
      if (!item.rem?.periodo) return false;
      const itemPeriod = moment(item.rem.periodo, 'YYYY-MM-DD').format('YYYY-MM');
      return itemPeriod === selectedPeriod.value;
    });
  }, [data, selectedPeriod]);

  // Filter by selected companies for comparison view
  const filteredComparisonData = useMemo(() => {
    if (selectedCompanies.length === 0) return currentPeriodData;
    
    return currentPeriodData.filter(item =>
      selectedCompanies.some(company => company.value === (item.rem?.company_name || 'Empresa Desconhecida'))
    );
  }, [currentPeriodData, selectedCompanies]);

  // Get trend data for selected companies (last 6 months)
  const trendData = useMemo(() => {
    if (selectedCompanies.length === 0 || !selectedPeriod) return {};

    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      last6Months.push(moment(selectedPeriod.value, 'YYYY-MM').subtract(i, 'months').format('YYYY-MM'));
    }

    const trends = {};
    selectedCompanies.forEach(company => {
      trends[company.value] = last6Months.map(period => {
        const periodData = data.find(item =>
          item.rem?.company_name === company.value &&
          moment(item.rem?.periodo, 'YYYY-MM-DD').format('YYYY-MM') === period
        );
        return {
          period,
          ltifr: periodData?.rem?.taxa_com_afastamento || 0,
          trifr: periodData?.rem?.total_incidentes_registraveis || 0,
          severity: periodData?.rem?.gravidade || 0,
        };
      });
    });

    return { trends, periods: last6Months };
  }, [data, selectedCompanies, selectedPeriod]);

  // LTIFR Comparison Chart
  const ltiffComparisonData = {
    labels: filteredComparisonData.map(item => item.rem?.company_name || 'Desconhecida'),
    datasets: [
      {
        label: 'LTIFR - Taxa de Acidentes com Afastamento',
        data: filteredComparisonData.map(item => Number(item.rem?.taxa_com_afastamento) || 0),
        backgroundColor: filteredComparisonData.map(item => 
          getChartColor(item.rem?.taxa_com_afastamento, 'LTIFR')
        ),
        borderColor: filteredComparisonData.map(item => {
          const level = getRiskLevel(item.rem?.taxa_com_afastamento, 'LTIFR');
          const colors = {
            EXCELLENT: 'rgba(34, 139, 34, 1)',
            ACCEPTABLE: 'rgba(218, 165, 32, 1)',
            CONCERNING: 'rgba(255, 140, 0, 1)',
            CRITICAL: 'rgba(220, 38, 38, 1)',
          };
          return colors[level] || colors.ACCEPTABLE;
        }),
        borderWidth: 2,
      },
    ],
  };

  const ltiffComparisonOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'LTIFR por Empresa - Período Selecionado',
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x;
            const level = getRiskLevel(value, 'LTIFR');
            return [
              `LTIFR: ${formatSafetyRate(value)}`,
              `Nível: ${level === 'EXCELLENT' ? 'Excelente' : level === 'ACCEPTABLE' ? 'Aceitável' : level === 'CONCERNING' ? 'Preocupante' : 'Crítico'}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Taxa de Acidentes com Afastamento (por milhão de horas)' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      y: {
        title: { display: true, text: 'Empresa' }
      },
    },
  };

  // TRIFR Comparison Chart
  const trifrComparisonData = {
    labels: filteredComparisonData.map(item => item.rem?.company_name || 'Desconhecida'),
    datasets: [
      {
        label: 'TRIFR - Total de Incidentes Registráveis',
        data: filteredComparisonData.map(item => Number(item.rem?.total_incidentes_registraveis) || 0),
        backgroundColor: filteredComparisonData.map(item =>
          getChartColor(item.rem?.total_incidentes_registraveis, 'TRIFR')
        ),
        borderColor: filteredComparisonData.map(item => {
          const level = getRiskLevel(item.rem?.total_incidentes_registraveis, 'TRIFR');
          const colors = {
            EXCELLENT: 'rgba(34, 139, 34, 1)',
            ACCEPTABLE: 'rgba(218, 165, 32, 1)',
            CONCERNING: 'rgba(255, 140, 0, 1)',
            CRITICAL: 'rgba(220, 38, 38, 1)',
          };
          return colors[level] || colors.ACCEPTABLE;
        }),
        borderWidth: 2,
      },
    ],
  };

  const trifrComparisonOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'TRIFR por Empresa - Período Selecionado',
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x;
            const level = getRiskLevel(value, 'TRIFR');
            return [
              `TRIFR: ${formatSafetyRate(value)}`,
              `Nível: ${level === 'EXCELLENT' ? 'Excelente' : level === 'ACCEPTABLE' ? 'Aceitável' : level === 'CONCERNING' ? 'Preocupante' : 'Crítico'}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Total de Incidentes Registráveis (por milhão de horas)' },
        grid: { color: 'rgba(0, 0, 0, 0.05)' }
      },
      y: {
        title: { display: true, text: 'Empresa' }
      },
    },
  };

  // Trend Line Chart (Gravidade)
  const severityTrendData = {
    labels: trendData.periods?.map(p => moment(p, 'YYYY-MM').format('MMM/YY')) || [],
    datasets: selectedCompanies.map((company, idx) => {
      const colors = [
        'rgba(59, 130, 246, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(168, 85, 247, 1)',
      ];
      return {
        label: company.label,
        data: trendData.trends?.[company.value]?.map(d => d.severity) || [],
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace('1)', '0.1)'),
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      };
    }),
  };

  const severityTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Tendência de Gravidade - Últimos 6 Meses',
        font: { size: 14, weight: 'bold' }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${formatSafetyRate(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Taxa de Gravidade' },
      },
      x: {
        title: { display: true, text: 'Período' },
      },
    },
  };

  return (
    <div className="box">
      <div className="level mb-4">
        <div className="level-left">
          <h2 className="title is-5 mb-0">📊 Análise de Indicadores de Segurança</h2>
        </div>
        <div className="level-right">
          <div className="buttons has-addons">
            <button
              className={`button is-small ${viewMode === 'comparison' ? 'is-info' : ''}`}
              onClick={() => setViewMode('comparison')}
            >
              Comparação
            </button>
            <button
              className={`button is-small ${viewMode === 'trend' ? 'is-info' : ''}`}
              onClick={() => setViewMode('trend')}
            >
              Tendência
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="columns mb-4">
        <div className="column is-4">
          <div className="field">
            <label className="label is-small">Período de Referência</label>
            <div className="control">
              <Select
                options={periodOptions}
                value={selectedPeriod}
                onChange={setSelectedPeriod}
                placeholder="Selecione o período..."
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </div>
        <div className="column is-8">
          <div className="field">
            <label className="label is-small">Empresas para Análise</label>
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

      {/* Legend */}
      <div className="notification is-light mb-4">
        <p className="is-size-7 mb-2"><strong>Legenda de Cores:</strong></p>
        <div className="tags">
          <span className="tag is-success">🟢 Excelente (LTIFR 0-2 | TRIFR 0-5)</span>
          <span className="tag is-warning">🟡 Aceitável (LTIFR 2-5 | TRIFR 5-10)</span>
          <span className="tag is-warning is-light">🟠 Preocupante (LTIFR 5-10 | TRIFR 10-20)</span>
          <span className="tag is-danger">🔴 Crítico (LTIFR &gt;10 | TRIFR &gt;20)</span>
        </div>
      </div>

      {/* Comparison View */}
      {viewMode === 'comparison' && (
        <div className="columns is-multiline">
          <div className="column is-6">
            <div className="box" style={{ height: '400px', position: 'relative' }}>
              {filteredComparisonData.length > 0 ? (
                <Bar data={ltiffComparisonData} options={ltiffComparisonOptions} />
              ) : (
                <div className="has-text-centered" style={{ paddingTop: '150px' }}>
                  <p className="has-text-grey">Selecione empresas e período para visualizar os dados</p>
                </div>
              )}
            </div>
          </div>
          <div className="column is-6">
            <div className="box" style={{ height: '400px', position: 'relative' }}>
              {filteredComparisonData.length > 0 ? (
                <Bar data={trifrComparisonData} options={trifrComparisonOptions} />
              ) : (
                <div className="has-text-centered" style={{ paddingTop: '150px' }}>
                  <p className="has-text-grey">Selecione empresas e período para visualizar os dados</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trend View */}
      {viewMode === 'trend' && (
        <div className="columns">
          <div className="column is-12">
            <div className="box" style={{ height: '400px', position: 'relative' }}>
              {selectedCompanies.length > 0 && trendData.periods?.length > 0 ? (
                <Line data={severityTrendData} options={severityTrendOptions} />
              ) : (
                <div className="has-text-centered" style={{ paddingTop: '150px' }}>
                  <p className="has-text-grey">Selecione empresas para visualizar as tendências</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info boxes */}
      {filteredComparisonData.length > 0 && viewMode === 'comparison' && (
        <div className="columns is-multiline mt-4">
          {filteredComparisonData.map((item, idx) => {
            const ltifr = Number(item.rem?.taxa_com_afastamento) || 0;
            const trifr = Number(item.rem?.total_incidentes_registraveis) || 0;
            const severity = Number(item.rem?.gravidade) || 0;
            const fatalities = Number(item.rem?.fatalidades) || 0;
            
            const ltifrLevel = getRiskLevel(ltifr, 'LTIFR');
            const tagClass = ltifrLevel === 'EXCELLENT' ? 'is-success' : 
                           ltifrLevel === 'ACCEPTABLE' ? 'is-warning' :
                           ltifrLevel === 'CONCERNING' ? 'is-warning is-light' : 'is-danger';
            
            return (
              <div className="column is-4" key={idx}>
                <div className="box has-background-light">
                  <p className="heading mb-2">{item.rem?.company_name}</p>
                  <div className="content is-small">
                    <p className="mb-1">
                      <strong>LTIFR:</strong> <span className={`tag ${tagClass} is-small`}>{formatSafetyRate(ltifr)}</span>
                    </p>
                    <p className="mb-1">
                      <strong>TRIFR:</strong> {formatSafetyRate(trifr)}
                    </p>
                    <p className="mb-1">
                      <strong>Gravidade:</strong> {formatSafetyRate(severity)}
                    </p>
                    {fatalities > 0 && (
                      <p className="has-text-danger has-text-weight-bold mb-0">
                        ⚠️ {fatalities} Fatalidade{fatalities > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RemCharts;