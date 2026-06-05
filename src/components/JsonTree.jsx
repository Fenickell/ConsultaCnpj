import { formatValueByContext, humanizeKey } from '../utils/formatters';

function PrimitiveRow({ label, value }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 sm:grid-cols-[220px,1fr]">
      <dt className="text-sm font-medium text-slate-500">{humanizeKey(label)}</dt>
      <dd className="break-words text-sm text-slate-900">{formatValueByContext(label, value)}</dd>
    </div>
  );
}

function ArrayNode({ label, items, depth }) {
  return (
    <details className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm" open={depth < 1}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        {humanizeKey(label)} <span className="text-slate-500">({items.length})</span>
      </summary>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => {
          const nodeKey = `${label}-${index}`;

          if (item && typeof item === 'object') {
            return (
              <div key={nodeKey} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Item {index + 1}
                </div>
                <JsonNode label={`${label}-${index}`} value={item} depth={depth + 1} hideLabel />
              </div>
            );
          }

          return <PrimitiveRow key={nodeKey} label={`${label} ${index + 1}`} value={item} />;
        })}
      </div>
    </details>
  );
}

function ObjectNode({ label, value, depth, hideLabel = false }) {
  const entries = Object.entries(value);

  if (!entries.length) {
    return <PrimitiveRow label={label} value="-" />;
  }

  const content = (
    <div className="space-y-3">
      {entries.map(([childKey, childValue]) => (
        <JsonNode key={childKey} label={childKey} value={childValue} depth={depth + 1} />
      ))}
    </div>
  );

  if (hideLabel) {
    return content;
  }

  return (
    <details className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm" open={depth < 1}>
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        {humanizeKey(label)}
      </summary>
      <div className="mt-4">{content}</div>
    </details>
  );
}

export default function JsonNode({ label, value, depth = 0, hideLabel = false }) {
  if (Array.isArray(value)) {
    return <ArrayNode label={label} items={value} depth={depth} />;
  }

  if (value && typeof value === 'object') {
    return <ObjectNode label={label} value={value} depth={depth} hideLabel={hideLabel} />;
  }

  return <PrimitiveRow label={label} value={value} />;
}
