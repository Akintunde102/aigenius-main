import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MissingProjectFolderModal } from '../MissingProjectFolderModal';
import type { CodeProject } from '@/lib/calls/code-projects';
import type { CodeProjectRootHealth } from '@/lib/code-projects/code-project-root-health.types';

const project: CodeProject = {
  id: 'p1',
  userId: 'u1',
  name: 'My App',
  rootPath: 'C:\\Users\\me\\Projects\\MyApp',
  rules: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const missingHealth: CodeProjectRootHealth = {
  projectId: 'p1',
  rootPath: project.rootPath,
  status: 'missing',
  ok: false,
  canRecreate: true,
  checkedAtIso: '2026-01-01T00:00:00.000Z',
};

describe('MissingProjectFolderModal', () => {
  it('renders relink and recreate when canRecreate is true', () => {
    render(
      <MissingProjectFolderModal
        project={project}
        health={missingHealth}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
        onRelink={jest.fn().mockResolvedValue(undefined)}
        onRecreate={jest.fn().mockResolvedValue(undefined)}
        onRemoveProject={jest.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Project folder not found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Relink folder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recreate empty folder/i })).toBeInTheDocument();
    expect(screen.getByText(/does not restore deleted files/i)).toBeInTheDocument();
  });

  it('hides recreate when canRecreate is false', () => {
    render(
      <MissingProjectFolderModal
        project={project}
        health={{ ...missingHealth, canRecreate: false, status: 'permission_denied' }}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
        onRelink={jest.fn().mockResolvedValue(undefined)}
        onRecreate={jest.fn().mockResolvedValue(undefined)}
        onRemoveProject={jest.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.queryByRole('button', { name: /Recreate empty folder/i })).not.toBeInTheDocument();
    expect(screen.getByText(/cannot access it/i)).toBeInTheDocument();
  });

  it('calls onRelink and onClose after successful relink', async () => {
    const onClose = jest.fn();
    const onRelink = jest.fn().mockResolvedValue(undefined);
    render(
      <MissingProjectFolderModal
        project={project}
        health={missingHealth}
        onClose={onClose}
        onDismiss={jest.fn()}
        onRelink={onRelink}
        onRecreate={jest.fn()}
        onRemoveProject={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Relink folder/i }));
    await waitFor(() => {
      expect(onRelink).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows remove confirmation before onRemoveProject', async () => {
    const onRemoveProject = jest.fn().mockResolvedValue(undefined);
    render(
      <MissingProjectFolderModal
        project={project}
        health={missingHealth}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
        onRelink={jest.fn()}
        onRecreate={jest.fn()}
        onRemoveProject={onRemoveProject}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove project from app/i }));
    expect(screen.getByText(/conversations stay in history/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Remove project$/i }));
    await waitFor(() => expect(onRemoveProject).toHaveBeenCalled());
  });
});
