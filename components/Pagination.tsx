import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, disabled }) => {
  if (totalPages <= 1) return null;

  const handlePrev = () => onPageChange(currentPage - 1);
  const handleNext = () => onPageChange(currentPage + 1);

  return (
    <div className="flex justify-between items-center mt-8 text-white">
      <button
        onClick={handlePrev}
        disabled={currentPage === 0 || disabled}
        className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition duration-200"
      >
        &larr; Назад
      </button>
      <span>
        Страница {currentPage + 1} из {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages - 1 || disabled}
        className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition duration-200"
      >
        Вперед &rarr;
      </button>
    </div>
  );
};

export default Pagination;