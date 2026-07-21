import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

// 코드 블록 복사 버튼 컴포넌트
const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800 text-xs text-slate-400">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // 스트리밍 도중 열린 코드블록이나 수식이 잘릴 경우를 대비한 자동 클로징 래퍼
  const sanitizeMarkdown = (text: string) => {
    let sanitized = text;
    // 백틱 3개 구문 미닫힘 처리
    const backtickMatches = (sanitized.match(/```/g) || []).length;
    if (backtickMatches % 2 !== 0) {
      sanitized += '\n```';
    }
    return sanitized;
  };

  return (
    <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed text-sm space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const value = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return <CodeBlock language={match[1]} value={value} />;
            }
            if (!inline) {
              return <CodeBlock language="text" value={value} />;
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs border border-slate-300/60 dark:border-slate-700" {...props}>
                {children}
              </code>
            );
          },
          table({ children }: any) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-700 text-left text-xs">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return <th className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 font-semibold text-slate-900 dark:text-slate-200">{children}</th>;
          },
          td({ children }: any) {
            return <td className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-200">{children}</td>;
          },
          a({ href, children }: any) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                {children}
              </a>
            );
          }
        }}
      >
        {sanitizeMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
};
