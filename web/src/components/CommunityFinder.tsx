import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, HandHeart, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { vi } from '../locales/vi';
export function CommunityFinder() {
  const [location, setLocation] = useState('Hà Nội');
  const [group, setGroup] = useState('');
  return (
    <section className="community-finder">
      <div className="container">
        <div className="finder-copy">
          <span className="eyebrow">{vi.catalog.finderEyebrow}</span>
          <h2>{vi.catalog.finderTitle}</h2>
          <p>{vi.catalog.finderBody}</p>
          <div className="finder-values">
            <span>
              <ShieldCheck size={15} />
              {vi.catalog.noMoney}
            </span>
            <span>
              <HandHeart size={15} />
              {vi.catalog.oneHelper}
            </span>
          </div>
        </div>
        <div className="finder-card panel">
          <span className="finder-icon">
            <Sparkles size={22} />
          </span>
          <h3>{vi.catalog.finderCardTitle}</h3>
          <div className="field">
            <label htmlFor="finder-location">
              <MapPin size={14} />
              {vi.requests.location}
            </label>
            <select
              id="finder-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="">{vi.catalog.allLocations}</option>
              {vi.catalog.locations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="finder-group">
              <BookOpen size={14} />
              {vi.catalog.groupLabel}
            </label>
            <select id="finder-group" value={group} onChange={(event) => setGroup(event.target.value)}>
              <option value="">{vi.catalog.allGroups}</option>
              {Object.entries(vi.catalog.groups).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Link
            className="btn btn-primary w-full"
            to={`/requests?${new URLSearchParams({ ...(location ? { location } : {}), ...(group ? { group } : {}) }).toString()}`}
          >
            {vi.catalog.findRequests}
            <ArrowRight size={17} />
          </Link>
          <small>{vi.catalog.finderNote}</small>
        </div>
      </div>
    </section>
  );
}
