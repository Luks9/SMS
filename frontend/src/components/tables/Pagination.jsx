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
        <button
          key={i}
          className={`button ${i === currentPage ? 'is-primary' : ''}`}
          onClick={() => handlePageClick(i)}
          disabled={disabled}
        >
          {i}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="pagination is-centered">
      <button
        className="button"
        onClick={handlePreviousPage}
        disabled={currentPage === 1 || disabled}
      >
        Anterior
      </button>
      {renderPageNumbers()}
      <button
        className="button"
        onClick={handleNextPage}
        disabled={currentPage === totalPages || disabled}
      >
        Próxima
      </button>
    </div>
  );
};

export default Pagination;