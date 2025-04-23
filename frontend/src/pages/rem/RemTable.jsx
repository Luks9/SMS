import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const RemTable = ({ rems }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleEdit = (rem) => {
    const formattedPeriodo = rem.periodo && moment(rem.periodo, moment.ISO_8601, true).isValid()
      ? moment(rem.periodo).format('YYYY-MM')
      : '';
    navigate('/rem-empresa/edite', {
      state: {
        initialData: {
          ...rem,
          periodo: formattedPeriodo,
          consumo_diesel: rem.consumo_diesel || 0,
          funcionarios_demitidos: rem.funcionarios_demitidos || 0,
        },
      },
    });
  };

  const paginatedRems = rems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(rems.length / itemsPerPage);

  return (
    <div className="box">
      <h2 className="subtitle">Relatório Estatístico</h2>
      <div className="table-container">
        <table className="table is-hoverable is-fullwidth">
          <thead>
            <tr>
              <th>Período</th>
              <th>Empregados</th>
              <th>Horas-Homem</th>
              <th>Acidentes com Afast.</th>
              <th>Tratamento Médico</th>
              <th>Trabalho Restrito</th>
              <th>Consumo de Diesel (litros)</th>
              <th>Funcionários Demitidos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRems.map((rem) => (
              <tr key={rem.id}>
                <td>{rem.periodo_formatado}</td>
                <td>{rem.empregados}</td>
                <td>{rem.horas_homem_exposicao}</td>
                <td>{rem.acidentes_com_afastamento_tipicos}</td>
                <td>{rem.tratamento_medico}</td>
                <td>{rem.trabalho_restrito}</td>
                <td>{rem.consumo_diesel}</td>
                <td>{rem.funcionarios_demitidos}</td>
                <td>
                  <button
                    className="button is-small is-info"
                    onClick={() => handleEdit(rem)}
                  >
                    Editar
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
            {Array.from({ length: totalPages }, (_, index) => (
              <li key={index}>
                <button
                  className={`pagination-link ${currentPage === index + 1 ? 'is-current' : ''}`}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default RemTable;