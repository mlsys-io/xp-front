type NodeType = "trigger" | "filter" | "agent" | "llm" | "operation";

const NODE_META: Record<NodeType, { icon: string; color: string; bg: string; border: string }> = {
  trigger:   { icon: "⚡", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  filter:    { icon: "⊘",  color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  agent:     { icon: "❋",  color: "text-teal-700",   bg: "bg-teal-50",   border: "border-teal-200" },
  llm:       { icon: "◈",  color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  operation: { icon: "▷",  color: "text-gray-600",   bg: "bg-gray-50",   border: "border-gray-200" },
};

// Extracts ordered node type sequence from tags like ["nodes:trigger", "nodes:filter", "nodes:llm"]
export function extractNodeSequence(tags: string[]): NodeType[] {
  return (tags || [])
    .filter(t => t.startsWith("nodes:"))
    .map(t => t.replace("nodes:", "") as NodeType)
    .filter(t => t in NODE_META);
}

export function WorkflowNodeFlow({ tags, maxShow = 5 }: { tags: string[]; maxShow?: number }) {
  const nodes = extractNodeSequence(tags);
  if (nodes.length === 0) return null;
  const shown = nodes.slice(0, maxShow);
  const extra = nodes.length - shown.length;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {shown.map((n, i) => {
        const m = NODE_META[n];
        return (
          <span key={i} className="flex items-center gap-0.5">
            <span
              title={n}
              className={`inline-flex items-center gap-0.5 text-[10px] rounded border px-1.5 py-0.5 ${m.bg} ${m.border} ${m.color} font-medium`}
            >
              {m.icon} {n}
            </span>
            {i < shown.length - 1 && (
              <span className="text-[10px] text-gray-300 select-none">→</span>
            )}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="text-[10px] text-gray-400">+{extra}</span>
      )}
    </div>
  );
}
