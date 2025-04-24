import React, { useState } from 'react';

const RemTabelaAvaliador = ({ data, loading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState(null);

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

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  if (loading) {
    return <p>Carregando...</p>;
  }

  return (
    <div className="card">
      <header className="card-header">
        <p className="card-header-title">Tabela de Avaliação de REMs</p>
        <button className="card-header-icon" aria-label="more options" />
      </header>
      <div className="card-content">
        <div className="field">
          <label className="label is-small">Itens por página:</label>
          <div className="control">
            <div className="select is-small">
              <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>
        <table className="table is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Período</th>
              <th>Colaboradores</th>
              <th>Horas Trabalhadas</th>
              <th>Consumo de Diesel</th>
              <th>Funcionários Demitidos</th>
              <th>Fatalidades</th>
              <th>Gravidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={index}>
                <td>{item.rem?.company_name || 'Empresa Desconhecida'}</td>
                <td>{item.rem.periodo.slice(5, 7) + '-' + item.rem.periodo.slice(0, 4)}</td>
                <td>{item.rem.empregados}</td>
                <td>{item.rem.horas_homem_exposicao}</td>
                <td>{item.consumo_diesel || 'N/A'}</td>
                <td>{item.funcionarios_demitidos || 'N/A'}</td>
                <td>{item.rem.fatalidades}</td>
                <td>{item.rem.gravidade}</td>
                <td>
                  <button
                    className="button is-small is-info"
                    onClick={() => handleOpenModal(item)}
                  >
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            disabled={currentPage === totalPages}
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
      </div>

      {selectedRecord && (
        <div className={`modal ${selectedRecord ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={handleCloseModal}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Detalhes do Registro</p>
              <button className="delete" aria-label="close" onClick={handleCloseModal}></button>
            </header>
            <section className="modal-card-body">
              <h2 className="subtitle">{selectedRecord.rem?.company_name || 'Empresa Desconhecida'}</h2>
              <table className="table is-fullwidth is-striped is-hoverable">
                <tbody>
                  <tr>
                    <th>Período</th>
                    <td>{selectedRecord.rem.periodo.slice(5, 7) + '-' + selectedRecord.rem.periodo.slice(0, 4)}</td>
                  </tr>
                  <tr>
                    <th>Empregados</th>
                    <td>{selectedRecord.rem.empregados}</td>
                  </tr>
                  <tr>
                    <th>Horas Homem Exposição</th>
                    <td>{selectedRecord.rem.horas_homem_exposicao}</td>
                  </tr>
                  <tr>
                    <th>Fatalidades</th>
                    <td>{selectedRecord.rem.fatalidades}</td>
                  </tr>
                  <tr>
                    <th>Acidentes com Afastamento Típicos</th>
                    <td>{selectedRecord.rem.acidentes_com_afastamento_tipicos}</td>
                  </tr>
                  <tr>
                    <th>Tratamento Médico</th>
                    <td>{selectedRecord.rem.tratamento_medico}</td>
                  </tr>
                  <tr>
                    <th>Trabalho Restrito</th>
                    <td>{selectedRecord.rem.trabalho_restrito}</td>
                  </tr>
                  <tr>
                    <th>Primeiros Socorros</th>
                    <td>{selectedRecord.rem.primeiros_socorros}</td>
                  </tr>
                  <tr>
                    <th>Dias Perdidos Debitados</th>
                    <td>{selectedRecord.rem.dias_perdidos_debitados}</td>
                  </tr>
                  <tr>
                    <th>Acidentados Registráveis</th>
                    <td>{selectedRecord.rem.acidentados_registraveis}</td>
                  </tr>
                  <tr>
                    <th>Acidentes com Afastamento</th>
                    <td>{selectedRecord.rem.acidentes_com_afastamento}</td>
                  </tr>
                  <tr>
                    <th>Acidentes sem Afastamento</th>
                    <td>{selectedRecord.rem.acidentes_sem_afastamento}</td>
                  </tr>
                  <tr>
                    <th>Acidentes de Trânsito</th>
                    <td>{selectedRecord.rem.acidentes_transito}</td>
                  </tr>
                  <tr>
                    <th>Outros</th>
                    <td>{selectedRecord.rem.outros}</td>
                  </tr>
                  <tr>
                    <th>Total de Incidentes Registráveis</th>
                    <td>{selectedRecord.rem.total_incidentes_registraveis}</td>
                  </tr>
                  <tr>
                    <th>Taxa com Afastamento</th>
                    <td>{selectedRecord.rem.taxa_com_afastamento}</td>
                  </tr>
                  <tr>
                    <th>Taxa sem Afastamento</th>
                    <td>{selectedRecord.rem.taxa_sem_afastamento}</td>
                  </tr>
                  <tr>
                    <th>Incidência</th>
                    <td>{selectedRecord.rem.incidencia}</td>
                  </tr>
                  <tr>
                    <th>Gravidade</th>
                    <td>{selectedRecord.rem.gravidade}</td>
                  </tr>
                  <tr>
                    <th>LMA NCA</th>
                    <td>{selectedRecord.rem.lma_nca}</td>
                  </tr>
                  <tr>
                    <th>LMA TFCA</th>
                    <td>{selectedRecord.rem.lma_tfca}</td>
                  </tr>
                  <tr>
                    <th>Consumo de Diesel</th>
                    <td>{selectedRecord.consumo_diesel?.diesel_consumido || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>Funcionários Demitidos</th>
                    <td>{selectedRecord.funcionarios_demitidos?.funcionarios_demitidos || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
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