/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateCodeProjectModal } from '../CreateCodeProjectModal';

const mockIsDesktop = jest.fn(() => true);

jest.mock('@/lib/utils/desktop-runtime', () => ({
  isAigeniusDesktopRuntime: () => mockIsDesktop(),
}));

jest.mock('@/lib/code-projects/random-project-name', () => ({
  generateRandomProjectName: () => 'swift-atlas-42',
}));

function renderModal(
  props?: Partial<React.ComponentProps<typeof CreateCodeProjectModal>>,
) {
  const onClose = props?.onClose ?? jest.fn();
  const onCreate = props?.onCreate ?? jest.fn().mockResolvedValue(undefined);
  render(
    <CreateCodeProjectModal
      open
      onClose={onClose}
      onCreate={onCreate}
      {...props}
    />,
  );
  return { onClose, onCreate };
}

describe('CreateCodeProjectModal named folder button', () => {
  beforeEach(() => {
    mockIsDesktop.mockReturnValue(true);
    const root = document.createElement('div');
    root.id = 'modal-root';
    document.body.appendChild(root);
    window.aigeniusDesktop = {
      isDesktop: true,
      pickProjectDirectory: jest.fn().mockResolvedValue({ path: '/existing/project' }),
      createNamedProjectDirectory: jest.fn().mockResolvedValue({
        ok: true,
        path: '/tmp/swift-atlas-42',
        created: true,
      }),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.aigeniusDesktop;
  });

  async function getDialog() {
    return waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  }

  it('places the New button before the folder input and Browse after it', async () => {
    renderModal();
    await getDialog();

    const newButton = screen.getByRole('button', { name: /create a folder named after this project/i });
    const pathInput = screen.getByLabelText(/^folder$/i);
    const browseButton = screen.getByRole('button', { name: /^browse$/i });

    expect(newButton.compareDocumentPosition(pathInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(pathInput.compareDocumentPosition(browseButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.getByText(/use new to create a folder from the project name/i),
    ).toBeInTheDocument();
  });

  it('creates a folder from the typed name and fills the path without submitting', async () => {
    const { onCreate } = renderModal();
    await getDialog();

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'my-app' } });
    fireEvent.click(screen.getByRole('button', { name: /create a folder named after this project/i }));

    await waitFor(() => {
      expect(window.aigeniusDesktop?.createNamedProjectDirectory).toHaveBeenCalledWith({
        folderName: 'my-app',
      });
    });
    expect(screen.getByLabelText(/^folder$/i)).toHaveValue('/tmp/swift-atlas-42');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('generates a name when New is clicked with an empty name field', async () => {
    renderModal();
    await getDialog();

    fireEvent.click(screen.getByRole('button', { name: /create a folder named after this project/i }));

    await waitFor(() => {
      expect(window.aigeniusDesktop?.createNamedProjectDirectory).toHaveBeenCalledWith({
        folderName: 'swift-atlas-42',
      });
    });
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('swift-atlas-42');
  });

  it('leaves the folder path unchanged when the native picker is canceled', async () => {
    (window.aigeniusDesktop!.createNamedProjectDirectory as jest.Mock).mockResolvedValue({
      ok: true,
      canceled: true,
    });
    renderModal();
    await getDialog();

    fireEvent.change(screen.getByLabelText(/^folder$/i), { target: { value: '/keep/this' } });
    fireEvent.click(screen.getByRole('button', { name: /create a folder named after this project/i }));

    await waitFor(() => {
      expect(window.aigeniusDesktop?.createNamedProjectDirectory).toHaveBeenCalled();
    });
    expect(screen.getByLabelText(/^folder$/i)).toHaveValue('/keep/this');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the IPC error and still allows Browse', async () => {
    (window.aigeniusDesktop!.createNamedProjectDirectory as jest.Mock).mockResolvedValue({
      ok: false,
      error: 'Permission denied creating that folder',
    });
    renderModal();
    await getDialog();

    fireEvent.click(screen.getByRole('button', { name: /create a folder named after this project/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Permission denied creating that folder');
    });

    fireEvent.click(screen.getByRole('button', { name: /^browse$/i }));
    await waitFor(() => {
      expect(window.aigeniusDesktop?.pickProjectDirectory).toHaveBeenCalled();
    });
    expect(screen.getByLabelText(/^folder$/i)).toHaveValue('/existing/project');
  });

  it('hides New and Browse on web and still creates a project from a pasted path', async () => {
    mockIsDesktop.mockReturnValue(false);
    const { onCreate } = renderModal();
    await getDialog();

    expect(screen.queryByRole('button', { name: /create a folder named after this project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^browse$/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'web-app' } });
    fireEvent.change(screen.getByLabelText(/^folder$/i), { target: { value: '/abs/web-app' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: 'web-app',
        rootPath: '/abs/web-app',
        rules: undefined,
      });
    });
  });

  it('keeps Create disabled from submitting an incomplete form', async () => {
    const { onCreate } = renderModal();
    await getDialog();

    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Name and folder path are required');
  });
});
