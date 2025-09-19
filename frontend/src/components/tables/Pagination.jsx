// src/components/tables/Pagination.jsx

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange, disabled }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1 && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (!disabled) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <li key={i}>
          <a
            className={`pagination-link ${i === currentPage ? 'is-current' : ''}`}
            onClick={() => handlePageClick(i)}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
          >
            {i}
          </a>
        </li>
      );
    }
    return pages;
  };

  return (
    <nav className="pagination is-centered" role="navigation" aria-label="pagination">
      <a
        className="pagination-previous"
        onClick={handlePreviousPage}
        disabled={currentPage === 1 || disabled}
        style={{ cursor: (currentPage === 1 || disabled) ? 'not-allowed' : 'pointer', opacity: (currentPage === 1 || disabled) ? 0.6 : 1 }}
      >
        Anterior
      </a>
      <a
        className="pagination-next"
        onClick={handleNextPage}
        disabled={currentPage === totalPages || disabled}
        style={{ cursor: (currentPage === totalPages || disabled) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || disabled) ? 0.6 : 1 }}
      >
        Próxima
      </a>
      <ul className="pagination-list">
        {renderPageNumbers()}
      </ul>
    </nav>
  );
};

export default Pagination;