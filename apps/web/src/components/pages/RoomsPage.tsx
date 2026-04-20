import { type FormEvent, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useApp } from '../../context/AppContext';
import { RoomForm, initialRoomForm, type RoomFormState } from '../forms/RoomForm';
import { RoomsTable } from '../tables/RoomsTable';
import { type Room } from '@school-scheduler/shared';
import { RoomsService } from '../../api/rooms.service';

export function RoomsPage() {
  const { roomsOps, rooms } = useData();
  
  const [roomSearch, setRoomSearch] = useState('');
  const [roomPage, setRoomPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(initialRoomForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (roomsOps?.loading) {
    return <div className="loading">Loading rooms...</div>;
  }

  if (roomsOps?.error) {
    return <div className="error">Error: {roomsOps.error}</div>;
  }

  const filteredRooms = (rooms || []).filter((room) =>
    `${room.code} ${room.name} ${room.roomType || ''}`
      .toLowerCase()
      .includes((roomSearch || '').toLowerCase())
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
  const paginatedRooms = filteredRooms.slice(
    ((roomPage || 1) - 1) * itemsPerPage,
    (roomPage || 1) * itemsPerPage
  );

  const handleRoomEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomForm({
      capacity: String(room.capacity || ''),
      code: room.code,
      name: room.name,
      roomType: room.roomType || '',
    });
    setShowForm(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleRoomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (!roomForm.code || !roomForm.name) {
        setFormError('Room code and name are required.');
        setIsSaving(false);
        return;
      }

      if (editingRoomId) {
        await RoomsService.update(editingRoomId, {
          code: roomForm.code,
          name: roomForm.name,
          roomType: roomForm.roomType,
          capacity: parseInt(roomForm.capacity, 10),
        });
        setFormSuccess('Room updated successfully.');
      } else {
        await RoomsService.create({
          code: roomForm.code,
          name: roomForm.name,
          roomType: roomForm.roomType,
          capacity: parseInt(roomForm.capacity, 10),
        });
        setFormSuccess('Room added successfully.');
      }

      setRoomForm(initialRoomForm);
      setEditingRoomId(null);
      setShowForm(false);
      await roomsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save room');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoomDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) {
      return;
    }

    try {
      await RoomsService.delete(roomId);
      setFormSuccess('Room deleted successfully.');
      await roomsOps.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to delete room');
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          {showForm ? 'Cancel' : 'Add Room'}
        </button>
        <input
          type="text"
          placeholder="Search rooms..."
          value={roomSearch || ''}
          onChange={(e) => setRoomSearch?.(e.target.value)}
          className="search-input"
        />
      </div>

      {showForm && (
        <div className="form-section">
          <RoomForm
            actionLabel={editingRoomId ? 'Update Room' : 'Add Room'}
            cancelLabel="Cancel"
            errorMessage={formError}
            form={roomForm}
            isSaving={isSaving}
            onChange={setRoomForm}
            onCancel={() => {
              setShowForm(false);
              setEditingRoomId(null);
              setRoomForm(initialRoomForm);
              setFormError(null);
              setFormSuccess(null);
            }}
            onSubmit={handleRoomSubmit}
            successMessage={formSuccess}
          />
        </div>
      )}

      <div className="table-section">
        {filteredRooms.length === 0 ? (
          <p>No rooms found</p>
        ) : (
          <>
            <div className="table-info">
              <span>
                {paginatedRooms.length} of {filteredRooms.length} rooms
              </span>
            </div>
            <RoomsTable
              rooms={paginatedRooms}
              pagination={{ page: roomPage || 1, totalPages }}
              setPage={(page) => setRoomPage(typeof page === 'function' ? page(roomPage) : page)}
              onEdit={handleRoomEdit}
              onDelete={handleRoomDelete}
              onOpenDetail={(id) => console.log('View detail:', id)}
              onViewSchedule={(id) => console.log('View schedule:', id)}
            />
          </>
        )}
      </div>
    </div>
  );
}
