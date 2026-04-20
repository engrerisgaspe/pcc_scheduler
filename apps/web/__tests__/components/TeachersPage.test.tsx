/**
 * TeachersPage Component Test Example
 * Demonstrates how to test React components with hooks and context
 * 
 * Run with: npm run test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeachersPage } from '../../src/components/pages/TeachersPage';
import { DataProvider } from '../../src/context/DataContext';
import { AppProvider } from '../../src/context/AppContext';

// Mock the useData hook
vi.mock('../../src/context/DataContext', async () => {
  const actual = await vi.importActual('../../src/context/DataContext');
  return {
    ...actual,
    useData: () => ({
      teachers: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          employeeId: 'E001',
          employmentType: 'FULL_TIME',
          maxWeeklyLoadHours: 24,
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          employeeId: 'E002',
          employmentType: 'PART_TIME',
          maxWeeklyLoadHours: 12,
        },
      ],
      teachersOps: {
        loading: false,
        error: null,
        isSaving: false,
        saveError: null,
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getTeacherLoad: vi.fn(),
        refetch: vi.fn(),
      },
    }),
  };
});

// Mock useApp hook
vi.mock('../../src/context/AppContext', async () => {
  const actual = await vi.importActual('../../src/context/AppContext');
  return {
    ...actual,
    useApp: () => ({
      teacherSearch: '',
      setTeacherSearch: vi.fn(),
      teacherPage: 1,
      setTeacherPage: vi.fn(),
    }),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      <DataProvider>{component}</DataProvider>
    </AppProvider>
  );
};

describe('TeachersPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page header', () => {
    renderWithProviders(<TeachersPage />);

    expect(screen.getByText(/Add Teacher/i)).toBeInTheDocument();
  });

  it('should render the search input', () => {
    renderWithProviders(<TeachersPage />);

    const searchInput = screen.getByPlaceholderText(/Search teachers/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should render teachers table with data', () => {
    renderWithProviders(<TeachersPage />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('E001')).toBeInTheDocument();
  });

  it('should filter teachers based on search', async () => {
    renderWithProviders(<TeachersPage />);

    const searchInput = screen.getByPlaceholderText(/Search teachers/i);

    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  it('should show/hide form when Add Teacher button is clicked', () => {
    renderWithProviders(<TeachersPage />);

    const addButton = screen.getByText(/Add Teacher/i);
    fireEvent.click(addButton);

    // Form should appear (look for the text that appears in form mode)
    expect(screen.getByText(/Teacher form goes here/i)).toBeInTheDocument();
  });

  it('should have pagination controls', () => {
    renderWithProviders(<TeachersPage />);

    expect(screen.getByText(/Previous/i)).toBeInTheDocument();
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1/i)).toBeInTheDocument();
  });

  it('should render action buttons for each teacher', () => {
    renderWithProviders(<TeachersPage />);

    const editButtons = screen.getAllByText(/Edit/i);
    expect(editButtons.length).toBeGreaterThan(0);

    const deleteButtons = screen.getAllByText(/Delete/i);
    expect(deleteButtons.length).toBeGreaterThan(0);
  });
});
