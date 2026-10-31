'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const PAGE_SIZE = 15;

export function usePager(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const first = items[0]?._id || items[0]?.code || items[0]?.customerCode || '';
  const last = items[items.length - 1]?._id || items[items.length - 1]?.code || items[items.length - 1]?.customerCode || '';
  const resetKey = `${items.length}:${first}:${last}`;
  useEffect(() => {
    setPage(1);
  }, [resetKey]);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const slice = useMemo(() => items.slice(0, current * pageSize), [items, current, pageSize]);
  const hasMore = slice.length < items.length;
  const loadMore = useCallback(() => {
    setPage((p) => p + 1);
  }, []);
  return {
    slice,
    total: items.length,
    shown: slice.length,
    hasMore,
    loadMore,
  };
}

export default function Pagination({ hasMore, shown, total, noun = 'rows' }) {
  if (!total) return null;
  return (
    <div className="pager">
      <span className="muted small">
        {hasMore ? `Showing ${shown} of ${total} ${noun} · scroll for more` : `${total} ${noun}`}
      </span>
    </div>
  );
}

export function ScrollTable({ children, pager, noun }) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !pager.hasMore) return undefined;
    const onScroll = () => {
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 96) pager.loadMore();
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => root.removeEventListener('scroll', onScroll);
  }, [pager.hasMore, pager.loadMore, pager.shown]);
  return (
    <div className="table-wrap table-scroll" ref={rootRef}>
      {children}
      <Pagination {...pager} noun={noun} />
    </div>
  );
}
