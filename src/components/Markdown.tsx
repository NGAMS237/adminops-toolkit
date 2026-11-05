import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";

export default function Markdown({ children }: { children: string }) {
  if (!children?.trim()) return null;
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const text = String(children ?? "");
            const m = /language-(\w+)/.exec(className ?? "");
            if (m || text.includes("\n")) return <CodeBlock code={text.replace(/\n$/, "")} language={m?.[1] ?? "text"} />;
            return <code>{children}</code>;
          },
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
