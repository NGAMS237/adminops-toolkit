import { LANGUAGES, label } from "@/domain/constants";
import { highlightCode } from "@/lib/highlight";
import CopyButton from "./CopyButton";

export default function CodeBlock({ code, language = "text", title }: { code: string; language?: string; title?: string }) {
  const html = highlightCode(code, language);
  return (
    <div className="codeblock">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
          {title ? `${title} · ` : ""}{label(LANGUAGES, language)}
        </span>
        <CopyButton text={code} className="no-print" />
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
}
