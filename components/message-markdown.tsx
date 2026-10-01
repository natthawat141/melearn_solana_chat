import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// assistant-ui recommends react-markdown for messages outside its runtime.
// Keep the existing conversation, quota and guest-preview flow.
export function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="chat-markdown min-w-0 text-[15px] leading-7">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false }]]}
        skipHtml
        components={{
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
          table: ({ children }) => <div className="overflow-x-auto"><table>{children}</table></div>,
          pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
