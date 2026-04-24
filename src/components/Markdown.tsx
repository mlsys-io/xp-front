import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";

type Props = {
  children: string;
  className?: string;
};

/** Markdown renderer for READMEs, blob previews, and manifest bodies.
 *  - GFM: tables, task lists, strikethrough, autolink
 *  - Sanitize: strip scripts, event handlers, and other XSS vectors
 *  - Highlight: syntax colors for fenced code blocks
 *  The prose-styling comes from Tailwind utility classes applied at the
 *  wrapper level so pages can tune size/color without touching this file. */
export function Markdown({ children, className }: Props) {
  return (
    <div className={`markdown-body ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeHighlight]}
        components={{
          a: (props) => (
            <a
              {...props}
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-teal-700 hover:underline"
            />
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = /language-\w+/.test(className || "");
            return isBlock ? (
              <code className={className} {...props}>{children}</code>
            ) : (
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em]" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
