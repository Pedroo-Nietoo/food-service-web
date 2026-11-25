import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize?: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (nextPage: number) => void;
}

export function Pagination({
  page,
  pageSize = 20,
  totalItems,
  itemLabel,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const maxVisible = 5;
  let firstPage = Math.max(1, safePage - Math.floor(maxVisible / 2));
  const lastPage = Math.min(totalPages, firstPage + maxVisible - 1);
  if (lastPage - firstPage + 1 < maxVisible) {
    firstPage = Math.max(1, lastPage - maxVisible + 1);
  }
  const pages: number[] = [];
  for (let i = firstPage; i <= lastPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7e8e2] px-5 py-3 text-[12px] text-[#73766e]">
      <span>
        {totalItems === 0
          ? `Mostrando 0 de 0 ${itemLabel}`
          : `Mostrando ${start}–${end} de ${totalItems} ${itemLabel}`}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="inline-flex items-center gap-1 rounded-[8px] border border-[#e7e8e2] bg-white px-2.5 py-1.5 font-medium text-[#252824] hover:bg-[#f7f8f4] disabled:opacity-40"
        >
          <ChevronLeft className="size-3.5" />
          <span>Anterior</span>
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-[30px] rounded-[8px] px-2 py-1.5 text-center font-medium transition ${
              p === safePage
                ? 'bg-[#fff0e7] font-semibold text-[#d64b19]'
                : 'border border-[#e7e8e2] bg-white text-[#73766e] hover:bg-[#f7f8f4]'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="inline-flex items-center gap-1 rounded-[8px] border border-[#e7e8e2] bg-white px-2.5 py-1.5 font-medium text-[#252824] hover:bg-[#f7f8f4] disabled:opacity-40"
        >
          <span>Próxima</span>
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
