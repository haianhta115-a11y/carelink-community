import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../api/client';
import type { Category } from '../api/types';
import { CategoryIcon } from './RequestComponents';
import { Button, EmptyState, ErrorState } from './ui';
import { vi } from '../locales/vi';
export function CategoryExplorer() {
  const query = useQuery<Category[]>({
    queryKey: ['public-categories'],
    queryFn: async () => (await api.get('/public/categories')).data,
    staleTime: 300000,
  });
  const [group, setGroup] = useState('');
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState(false);
  const categories = useMemo(
    () =>
      (query.data ?? []).filter(
        (category) =>
          (!group || category.groupKey === group) &&
          `${category.name} ${category.description}`
            .toLocaleLowerCase('vi')
            .includes(keyword.toLocaleLowerCase('vi')),
      ),
    [query.data, group, keyword],
  );
  const displayed = expanded || group || keyword ? categories : categories.slice(0, 12);
  return (
    <section className="section categories-section" id="fields">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <div className="eyebrow">{vi.catalog.eyebrow}</div>
            <h2>{vi.catalog.title}</h2>
            <p>{vi.catalog.body}</p>
          </div>
          <span className="catalog-count">
            <SlidersHorizontal size={17} />
            {query.data?.length ?? 45} {vi.catalog.fields}
          </span>
        </div>
        <div className="catalog-tools">
          <nav aria-label={vi.catalog.groupsLabel}>
            <button className={!group ? 'active' : ''} onClick={() => setGroup('')}>
              {vi.common.all}
            </button>
            {Object.entries(vi.catalog.groups).map(([value, label]) => (
              <button key={value} className={group === value ? 'active' : ''} onClick={() => setGroup(value)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="catalog-search">
            <Search size={17} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              aria-label={vi.catalog.search}
              placeholder={vi.catalog.searchHint}
            />
          </div>
        </div>
        {query.isPending ? (
          <div className="category-grid">
            {Array.from({ length: 9 }, (_, index) => (
              <div className="category-card" key={index}>
                <span className="skeleton h-12 w-12" />
                <span className="skeleton h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState retry={() => void query.refetch()} />
        ) : displayed.length ? (
          <div className="category-grid expanded-catalog">
            {displayed.map((category) => (
              <Link
                key={category.id}
                to={`/requests?categoryId=${category.id}`}
                className={`category-card group-${category.groupKey}`}
              >
                <span className="category-icon">
                  <CategoryIcon name={category.icon} size={25} />
                </span>
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
                <ArrowUpRight className="category-arrow" size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title={vi.catalog.noResults}
            body={vi.catalog.noResultsBody}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setKeyword('');
                  setGroup('');
                }}
              >
                {vi.requests.clearFilters}
              </Button>
            }
          />
        )}
        {!group && !keyword && categories.length > 12 && (
          <div className="catalog-expand">
            <Button variant="secondary" onClick={() => setExpanded(!expanded)}>
              {expanded ? vi.catalog.collapse : vi.catalog.showAll}
              <ChevronDown size={17} className={expanded ? 'rotate-180' : ''} />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
