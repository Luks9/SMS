import React, { useMemo, useState } from 'react';
import { getRiskColor, formatSafetyRate, formatNumber } from '../../utils/safetyMetrics';

const RemTabelaAvaliador = ({ data, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('periodo_desc');

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1); // Reset to first page
  };

  const handleOpenModal = (record) => {
    setSelectedRecord(record);
  };

  const handleCloseModal = () => {
    setSelectedRecord(null);
  };

  const formatPeriodo = (periodo) => {
    if (!periodo) return 'N/A';
    if (periodo.length >= 7) {
      return `${periodo.slice(5, 7)}-${periodo.slice(0, 4)}`;
    }
    return periodo;
  };

  const getDieselValue = (item) =>
    item?.consumo_diesel?.diesel_consumido ?? item?.consumo_diesel ?? 0;
  const getDemitidosValue = (item) =>
    item?.funcionarios_demitidos?.funcionarios_demitidos ?? item?.funcionarios_demitidos ?? 0;

  const normalizedData = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    return safeData.map((item) => {
      const rem = item?.rem || {};
      const companyName = rem.company_name || 'Empresa Desconhecida';
      const periodoLabel = formatPeriodo(rem.periodo);
      return {
        ...item,
        _meta: {
          companyName,
          periodoLabel,
          dieselValue: getDieselValue(item),
          demitidosValue: getDemitidosValue(item),
          periodoRaw: rem.periodo || '',
        },
      };
    });
  }, [data]);

  const companyOptions = useMemo(() => {
    return [...new Set(normalizedData.map((item) => item._meta.companyName))].sort();
  }, [normalizedData]);

  const periodOptions = useMemo(() => {
    const options = [...new Set(normalizedData.map((item) => item._meta.periodoLabel))].filter(
      (periodo) => periodo && periodo !== 'N/A'
    );
    return options.sort((a, b) => {
      const [monthA, yearA] = a.split('-').map(Number);
      const [monthB, yearB] = b.split('-').map(Number);
      return yearB * 12 + monthB - (yearA * 12 + monthA);
    });
  }, [normalizedData]);

  const filteredData = useMemo(() => {
    let result = [...normalizedData];

    if (companyFilter !== 'all') {
      result = result.filter((item) => item._meta.companyName === companyFilter);
    }

    if (periodFilter !== 'all') {
      result = result.filter((item) => item._meta.periodoLabel === periodFilter);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      result = result.filter((item) => item._meta.companyName.toLowerCase().includes(query));
    }

    if (sortBy === 'periodo_desc') {
      result.sort((a, b) => (a._meta.periodoRaw < b._meta.periodoRaw ? 1 : -1));
    }
    if (sortBy === 'periodo_asc') {
      result.sort((a, b) => (a._meta.periodoRaw > b._meta.periodoRaw ? 1 : -1));
    }
    if (sortBy === 'empresa_asc') {
      result.sort((a, b) => a._meta.companyName.localeCompare(b._meta.companyName));
    }
    if (sortBy === 'empresa_desc') {
      result.sort((a, b) => b._meta.companyName.localeCompare(a._meta.companyName));
    }

    return result;
  }, [normalizedData, companyFilter, periodFilter, searchTerm, sortBy]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (loading) {
    return <p className="has-text-centered">Carregando...</p>;
  }

  return (
    <div className="box">
      <div className="columns is-vcentered">
        <div className="column is-4">
          <h2 className="title is-5 mb-1">Registros de Avaliação</h2>
          <p className="subtitle is-7">Filtros inteligentes e visão completa por período.</p>
        </div>
        <div className="column is-8">
          <div className="columns is-multiline">
            <div className="column is-4">
              <div className="field">
                <label className="label is-small">Buscar empresa</label>
                <div className="control">
                  <input
                    className="input is-small"
                    type="text"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Digite o nome da empresa"
                  />
                </div>
              </div>
            </div>
            <div className="column is-3">
              <div className="field">
                <label className="label is-small">Empresa</label>
                <div className="control">
                  <div className="select is-small is-fullwidth">
                    <select
                      value={companyFilter}
                      onChange={(event) => {
                        setCompanyFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Todas</option>
                      {companyOptions.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column is-2">
              <div className="field">
                <label className="label is-small">Período</label>
                <div className="control">
                  <div className="select is-small is-fullwidth">
                    <select
                      value={periodFilter}
                      onChange={(event) => {
                        setPeriodFilter(event.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Todos</option>
                      {periodOptions.map((periodo) => (
                        <option key={periodo} value={periodo}>
                          {periodo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column is-2">
              <div className="field">
                <label className="label is-small">Ordenação</label>
                <div className="control">
                  <div className="select is-small is-fullwidth">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <option value="periodo_desc">Período (recente)</option>
                      <option value="periodo_asc">Período (antigo)</option>
                      <option value="empresa_asc">Empresa (A-Z)</option>
                      <option value="empresa_desc">Empresa (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="column is-1">
              <div className="field">
                <label className="label is-small">Por página</label>
                <div className="control">
                  <div className="select is-small is-fullwidth">
                    <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="level is-mobile">
        <div className="level-left">
          <span className="tag is-light">
            Mostrando {filteredData.length} de {normalizedData.length} registros
          </span>
        </div>
        <div className="level-right">
          <div className="tags">
            <span className="tag is-success is-light">🟢 Excelente</span>
            <span className="tag is-warning is-light">🟡 Aceitável</span>
            <span className="tag is-danger is-light">🔴 Crítico</span>
          </div>
        </div>
      </div>

      <div className="table-container mt-3">
        <table className="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Período</th>
              <th className="has-text-centered">Empregados</th>
              <th className="has-text-centered">Diesel (L)</th>
              <th className="has-text-centered">Demitidos</th>
              <th>Status</th>
              <th className="has-text-centered">LTIFR</th>
              <th className="has-text-centered">TRIFR</th>
              <th className="has-text-centered">Gravidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => {
              const ltifr = item.rem?.taxa_com_afastamento;
              const trifr = item.rem?.total_incidentes_registraveis;
              const gravidade = item.rem?.gravidade;
              
              const ltifrColor = getRiskColor(ltifr, 'LTIFR');
              const trifrColor = getRiskColor(trifr, 'TRIFR');
              const gravidadeColor = getRiskColor(gravidade, 'SEVERITY');
              
              // Overall status based on worst metric
              const statusColor = (ltifrColor.tag === 'is-danger' || trifrColor.tag === 'is-danger') ? ltifrColor :
                                 (ltifrColor.tag.includes('warning') || trifrColor.tag.includes('warning')) ? ltifrColor : ltifrColor;
              
              return (
                <tr key={index}>
                  <td><strong>{item._meta.companyName}</strong></td>
                  <td>{item._meta.periodoLabel}</td>
                  <td className="has-text-centered">{formatNumber(item.rem?.empregados)}</td>
                  <td className="has-text-centered">{formatNumber(item._meta.dieselValue)}</td>
                  <td className="has-text-centered">{formatNumber(item._meta.demitidosValue)}</td>
                  <td>
                    <span className={`tag ${statusColor.tag}`}>
                      {statusColor.icon}
                    </span>
                  </td>
                  <td className={`has-text-centered ${ltifrColor.bg}`}>
                    <strong className={ltifrColor.text}>
                      {formatSafetyRate(ltifr)}
                    </strong>
                  </td>
                  <td className={`has-text-centered ${trifrColor.bg}`}>
                    <strong className={trifrColor.text}>
                      {formatSafetyRate(trifr)}
                    </strong>
                  </td>
                  <td className={`has-text-centered ${gravidadeColor.bg}`}>
                    <strong className={gravidadeColor.text}>
                      {formatSafetyRate(gravidade)}
                    </strong>
                  </td>
                  <td>
                    <button
                      className="button is-small is-info is-light"
                      onClick={() => handleOpenModal(item)}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={10} className="has-text-centered has-text-grey">
                  Nenhum registro encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="pagination is-centered" role="navigation" aria-label="pagination">
        <button
          className="pagination-previous"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        <button
          className="pagination-next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Próximo
        </button>
        <ul className="pagination-list">
          {Array.from({ length: totalPages }, (_, i) => (
            <li key={i}>
              <button
                className={`pagination-link ${currentPage === i + 1 ? 'is-current' : ''}`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {selectedRecord && (
        <div className={`modal ${selectedRecord ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={handleCloseModal}></div>
          <div className="modal-card" style={{ maxWidth: '900px' }}>
            <header className="modal-card-head">
              <p className="modal-card-title">
                {selectedRecord._meta?.companyName || 'Empresa Desconhecida'}
                <span className="tag is-info is-light ml-2">{selectedRecord._meta?.periodoLabel}</span>
              </p>
              <button className="delete" aria-label="close" onClick={handleCloseModal}></button>
            </header>
            <section className="modal-card-body">
              {/* Key Safety Indicators */}
              <div className="box has-background-light">
                <p className="title is-6 mb-3">🎯 Indicadores Principais de Segurança</p>
                <div className="columns is-multiline">
                  <div className="column is-3">
                    <div className={`box ${getRiskColor(selectedRecord.rem?.taxa_com_afastamento, 'LTIFR').bg}`}>
                      <p className="heading">LTIFR</p>
                      <p className={`title is-4 ${getRiskColor(selectedRecord.rem?.taxa_com_afastamento, 'LTIFR').text}`}>
                        {formatSafetyRate(selectedRecord.rem?.taxa_com_afastamento)}
                      </p>
                      <p className="is-size-7">Taxa c/ Afastamento</p>
                    </div>
                  </div>
                  <div className="column is-3">
                    <div className={`box ${getRiskColor(selectedRecord.rem?.total_incidentes_registraveis, 'TRIFR').bg}`}>
                      <p className="heading">TRIFR</p>
                      <p className={`title is-4 ${getRiskColor(selectedRecord.rem?.total_incidentes_registraveis, 'TRIFR').text}`}>
                        {formatSafetyRate(selectedRecord.rem?.total_incidentes_registraveis)}
                      </p>
                      <p className="is-size-7">Total Incidentes</p>
                    </div>
                  </div>
                  <div className="column is-3">
                    <div className={`box ${getRiskColor(selectedRecord.rem?.gravidade, 'SEVERITY').bg}`}>
                      <p className="heading">Gravidade</p>
                      <p className={`title is-4 ${getRiskColor(selectedRecord.rem?.gravidade, 'SEVERITY').text}`}>
                        {formatSafetyRate(selectedRecord.rem?.gravidade)}
                      </p>
                      <p className="is-size-7">Índice de Gravidade</p>
                    </div>
                  </div>
                  <div className="column is-3">
                    <div className={`box ${Number(selectedRecord.rem?.fatalidades) > 0 ? 'has-background-danger' : 'has-background-success-light'}`}>
                      <p className="heading">Fatalidades</p>
                      <p className={`title is-4 ${Number(selectedRecord.rem?.fatalidades) > 0 ? 'has-text-white' : 'has-text-success-dark'}`}>
                        {Number(selectedRecord.rem?.fatalidades) > 0 ? '⚠️ ' : ''}{formatNumber(selectedRecord.rem?.fatalidades)}
                      </p>
                      <p className={`is-size-7 ${Number(selectedRecord.rem?.fatalidades) > 0 ? 'has-text-white' : ''}`}>
                        Zero Tolerância
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {[
                {
                  title: 'Informações Gerais',
                  items: [
                    ['Empregados', selectedRecord.rem?.empregados],
                    ['Horas Homem Exposição', selectedRecord.rem?.horas_homem_exposicao],
                    ['Dias Perdidos Debitados', selectedRecord.rem?.dias_perdidos_debitados],
                    ['Taxa de Incidência', selectedRecord.rem?.incidencia],
                  ],
                },
                {
                  title: 'Acidentes Típicos',
                  items: [
                    ['Acidentes com Afastamento', selectedRecord.rem?.acidentes_com_afastamento_tipicos],
                    ['Tratamento Médico', selectedRecord.rem?.tratamento_medico],
                    ['Trabalho Restrito', selectedRecord.rem?.trabalho_restrito],
                    ['Primeiros Socorros', selectedRecord.rem?.primeiros_socorros],
                    ['Acidentados Registráveis', selectedRecord.rem?.acidentados_registraveis],
                  ],
                },
                {
                  title: 'Acidentes Não Típicos',
                  items: [
                    ['Acidentes com Afastamento', selectedRecord.rem?.acidentes_com_afastamento],
                    ['Acidentes sem Afastamento', selectedRecord.rem?.acidentes_sem_afastamento],
                    ['Acidentes de Trânsito', selectedRecord.rem?.acidentes_transito],
                    ['Outros', selectedRecord.rem?.outros],
                  ],
                },
                {
                  title: 'Indicadores Adicionais',
                  items: [
                    ['Taxa sem Afastamento', selectedRecord.rem?.taxa_sem_afastamento],
                    ['LMA NCA', selectedRecord.rem?.lma_nca],
                    ['LMA TFCA', selectedRecord.rem?.lma_tfca],
                  ],
                },
                {
                  title: 'Dados Complementares',
                  items: [
                    ['Consumo de Diesel (L)', selectedRecord._meta?.dieselValue],
                    ['Funcionários Demitidos', selectedRecord._meta?.demitidosValue],
                  ],
                },
              ].map((section) => (
                <div className="box" key={section.title}>
                  <p className="title is-6 mb-2">{section.title}</p>
                  <div className="columns is-multiline">
                    {section.items.map(([label, value]) => (
                      <div className="column is-4" key={label}>
                        <p className="heading">{label}</p>
                        <p className="title is-6">{formatNumber(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <footer className="modal-card-foot">
              <button className="button" onClick={handleCloseModal}>Fechar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemTabelaAvaliador;
