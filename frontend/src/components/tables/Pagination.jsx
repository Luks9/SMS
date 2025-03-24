import React from 'react';

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  const renderPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          className={`button ${i === currentPage ? 'is-primary' : ''}`}
          onClick={() => handlePageClick(i)}
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
        disabled={currentPage === 1}
      >
        Anterior
      </button>
      {renderPageNumbers()}
      <button
        className="button"
        onClick={handleNextPage}
        disabled={currentPage === totalPages}
      >
        Próxima
      </button>
    </div>
  );
};

export default Pagination;
