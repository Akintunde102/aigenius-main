'use client';

import type { OutputData } from '@editorjs/editorjs';
import editorJsHtml from 'editorjs-html';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';

const EditorJsToHtml = editorJsHtml();

function PreviewRendererView({ data }: { data: OutputData }) {
  let html: string[] = [];
  try {
    html = EditorJsToHtml.parse(data) ?? [];
  } catch {
    return (
      <p className="text-sm text-red-700 dark:text-red-400" role="alert">
        Preview unavailable.
      </p>
    );
  }

  return (
    <div className="prose max-w-full" key={data.time}>
      {html.map((item, index) => (
        <div dangerouslySetInnerHTML={{ __html: item }} key={index} />
      ))}
    </div>
  );
}

export default function PreviewRenderer({ data }: { data: OutputData }) {
  return (
    <RenderErrorBoundary logLabel="[editor-preview]" message="Preview unavailable.">
      <PreviewRendererView data={data} />
    </RenderErrorBoundary>
  );
}
