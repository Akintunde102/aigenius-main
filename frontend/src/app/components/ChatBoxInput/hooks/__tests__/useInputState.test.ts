/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { useInputState } from '../useInputState';

describe('useInputState', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('restores draft when switching back before debounce completes', () => {
        const commits: Array<{ key: string; value: string }> = [];
        const onInputChange = jest.fn();

        const { result, rerender } = renderHook(
            (props: {
                sessionKey: string;
                external: string;
            }) =>
                useInputState({
                    externalInputValue: props.external,
                    onInputChange,
                    composerSessionKey: props.sessionKey,
                    commitDraftForKey: (key, value) => commits.push({ key, value }),
                }),
            {
                initialProps: { sessionKey: 'conv-a', external: '' },
            },
        );

        act(() => {
            result.current.handleInputChange('draft for a');
        });

        rerender({ sessionKey: 'conv-b', external: '' });

        expect(result.current.inputValue).toBe('');
        expect(commits).toEqual([{ key: 'conv-a', value: 'draft for a' }]);

        rerender({ sessionKey: 'conv-a', external: 'draft for a' });

        expect(result.current.inputValue).toBe('draft for a');
    });

    it('does not write debounced keystrokes to the wrong conversation after a switch', () => {
        const commits: Array<{ key: string; value: string }> = [];
        const onInputChange = jest.fn();

        const { result, rerender } = renderHook(
            (props: { sessionKey: string; external: string }) =>
                useInputState({
                    externalInputValue: props.external,
                    onInputChange,
                    composerSessionKey: props.sessionKey,
                    commitDraftForKey: (key, value) => commits.push({ key, value }),
                }),
            {
                initialProps: { sessionKey: 'conv-a', external: '' },
            },
        );

        act(() => {
            result.current.handleInputChange('hello');
        });

        rerender({ sessionKey: 'conv-b', external: '' });

        act(() => {
            jest.advanceTimersByTime(200);
        });

        expect(onInputChange).not.toHaveBeenCalledWith('hello');
        expect(commits.filter((c) => c.key === 'conv-b')).toEqual([]);
    });

    it('syncs same-session external updates such as STT injection', () => {
        const { result, rerender } = renderHook(
            (props: { external: string }) =>
                useInputState({
                    externalInputValue: props.external,
                    composerSessionKey: 'conv-a',
                }),
            { initialProps: { external: '' } },
        );

        rerender({ external: 'transcribed text' });

        expect(result.current.inputValue).toBe('transcribed text');
    });
});
