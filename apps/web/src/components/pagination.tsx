import React from "react";

export function CursorPagination(props: {
  nextCursor: string | null;
  onNext: (cursor: string) => void;
  onReset: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <div className="pagination">
      <button type="button" className="secondary" onClick={props.onReset} disabled={props.disabled}>
        重置分页
      </button>
      <button
        type="button"
        onClick={() => props.nextCursor && props.onNext(props.nextCursor)}
        disabled={!props.nextCursor || props.disabled}
      >
        下一页
      </button>
    </div>
  );
}

export function OffsetPagination(props: {
  offset: number;
  limit: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <div className="pagination">
      <button type="button" className="secondary" onClick={props.onPrev} disabled={props.offset === 0 || props.disabled}>
        上一页
      </button>
      <span className="muted" style={{ margin: "0 0.75rem" }}>
        偏移 {props.offset} · 每页 {props.limit}
      </span>
      <button type="button" onClick={props.onNext} disabled={!props.hasMore || props.disabled}>
        下一页
      </button>
    </div>
  );
}
