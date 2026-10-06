import { Compass, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { vi } from '../locales/vi';
export function NotFoundPage() {
  return (
    <main className="container not-found">
      <span className="not-found-code">404</span>
      <Compass size={48} />
      <h1>{vi.notFound.title}</h1>
      <p>{vi.notFound.body}</p>
      <Link className="btn btn-primary" to="/">
        {vi.notFound.cta}
        <ArrowRight size={17} />
      </Link>
    </main>
  );
}
