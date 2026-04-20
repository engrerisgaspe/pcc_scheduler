/**
 * Shared/Common UI components
 */

import { type Dispatch, type SetStateAction } from 'react';

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

export function PaginationControls({
  page,
  setPage,
  totalPages,
}: {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        className="secondary-button"
        disabled={page <= 1}
        onClick={() => setPage((current) => Math.max(1, current - 1))}
        type="button"
      >
        Previous
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        className="secondary-button"
        disabled={page >= totalPages}
        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
