import { type Dispatch, type SetStateAction } from 'react';
import { type Room } from '@school-scheduler/shared';
import { EmptyState, PaginationControls } from '../shared/UIComponents';

interface RoomsTableProps {
  rooms: Room[];
  pagination: { page: number; totalPages: number };
  setPage: Dispatch<SetStateAction<number>>;
  onEdit: (room: Room) => void;
  onDelete: (roomId: string) => Promise<void>;
  onOpenDetail: (roomId: string) => void;
  onViewSchedule: (roomId: string) => void;
}

export function RoomsTable({
  rooms,
  pagination,
  setPage,
  onEdit,
  onDelete,
  onOpenDetail,
  onViewSchedule,
}: RoomsTableProps) {
  if (rooms.length === 0) {
    return <EmptyState message="No records available yet." />;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr className="clickable-row" key={room.id} onClick={() => onOpenDetail(room.id)}>
              <td>{room.code}</td>
              <td>{room.name}</td>
              <td>{room.roomType ?? '-'}</td>
              <td>{room.capacity ?? '-'} students</td>
              <td>
                <div className="table-actions-inline" onClick={(event) => event.stopPropagation()}>
                  <button className="table-action" onClick={() => onOpenDetail(room.id)} type="button">
                    Details
                  </button>
                  <button className="table-action" onClick={() => onViewSchedule(room.id)} type="button">
                    View Schedule
                  </button>
                  <button className="table-action" onClick={() => onEdit(room)} type="button">
                    Edit
                  </button>
                  <button
                    className="table-action table-action-danger"
                    onClick={() => void onDelete(room.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls page={pagination.page} setPage={setPage} totalPages={pagination.totalPages} />
    </div>
  );
}
