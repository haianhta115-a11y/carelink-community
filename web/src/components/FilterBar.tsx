import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Category } from '../api/types';
import { vi } from '../locales/vi';
export function FilterBar({
  categories = [],
  defaultStatus = '',
}: {
  categories?: Category[];
  defaultStatus?: string;
}) {
  const [params, setParams] = useSearchParams();
  const [draft, setDraft] = useState(params.get('keyword') ?? '');
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const urlKeyword = params.get('keyword') ?? '';
  useEffect(() => {
    setDraft(urlKeyword);
    return () => clearTimeout(timeout.current);
  }, [urlKeyword]);
  function update(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  }
  function keyword(value: string) {
    setDraft(value);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => update('keyword', value.trim()), 400);
  }
  const labels: Record<string, string> = {
    keyword: vi.requests.keyword,
    location: vi.requests.location,
    categoryId: vi.requests.category,
    urgency: vi.requests.urgency,
    status: vi.requests.status,
    group: vi.catalog.groupLabel,
  };
  function display(key: string, value: string) {
    if (key === 'categoryId') return categories.find((c) => c.id === Number(value))?.name ?? value;
    if (key === 'urgency') return vi.urgencies[value as keyof typeof vi.urgencies];
    if (key === 'status') return vi.statuses[value as keyof typeof vi.statuses];
    if (key === 'group') return vi.catalog.groups[value as keyof typeof vi.catalog.groups] ?? value;
    return value;
  }
  const active = Array.from(params.entries()).filter(([key, value]) => labels[key] && value);
  return (
    <section className="filter-panel panel">
      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            value={draft}
            onChange={(event) => keyword(event.target.value)}
            aria-label={vi.requests.keyword}
            placeholder={vi.requests.searchHint}
          />
        </div>
        <div className="location-input">
          <MapPin size={16} />
          <input
            value={params.get('location') ?? ''}
            onChange={(event) => update('location', event.target.value)}
            placeholder={vi.requests.locationHint}
            aria-label={vi.requests.location}
          />
        </div>
        <label className="sr-only" htmlFor="filter-category">
          {vi.requests.category}
        </label>
        <select
          id="filter-category"
          value={params.get('categoryId') ?? ''}
          onChange={(event) => update('categoryId', event.target.value)}
        >
          <option value="">{vi.requests.allCategories}</option>
          {categories.map((category) => (
            <option value={category.id} key={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-urgency">
          {vi.requests.urgency}
        </label>
        <select
          id="filter-urgency"
          value={params.get('urgency') ?? ''}
          onChange={(event) => update('urgency', event.target.value)}
        >
          <option value="">{vi.requests.allUrgencies}</option>
          {Object.entries(vi.urgencies).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-status">
          {vi.requests.status}
        </label>
        <select
          id="filter-status"
          value={params.get('status') ?? defaultStatus}
          onChange={(event) => update('status', event.target.value)}
        >
          {!defaultStatus && <option value="">{vi.requests.allStatuses}</option>}
          {Object.entries(vi.statuses).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {active.length > 0 && (
        <div className="filter-chips">
          <SlidersHorizontal size={14} />
          {active.map(([key, value]) => (
            <button key={key} onClick={() => update(key, '')}>
              {labels[key]}: {display(key, value)}
              <X size={12} />
            </button>
          ))}
          <button
            className="clear-filters"
            onClick={() => {
              clearTimeout(timeout.current);
              setDraft('');
              setParams({});
            }}
          >
            {vi.requests.clearFilters}
          </button>
        </div>
      )}
    </section>
  );
}
