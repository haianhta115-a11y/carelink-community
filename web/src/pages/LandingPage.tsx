import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleCheck,
  HandHeart,
  Heart,
  HeartHandshake,
  Leaf,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vi } from '../locales/vi';
import { CategoryExplorer } from '../components/CategoryExplorer';
import { CommunityFinder } from '../components/CommunityFinder';
import { api } from '../api/client';
const stepIcons = [Send, HeartHandshake, MessageCircle, CircleCheck];
export function LandingPage() {
  const { data: stats } = useQuery<{ completedRequests: number; helpers: number; openRequests: number }>({
    queryKey: ['public-stats'],
    queryFn: async () => (await api.get('/public/stats')).data,
    retry: 1,
  });
  return (
    <main className="landing">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              {vi.landing.eyebrow}
            </div>
            <h1>
              {vi.landing.headline1}
              <br />
              <span>
                {vi.landing.headline2}
                <svg viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    d="M2 8Q190 -2 398 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="hero-lead">{vi.landing.lead}</p>
            <div className="hero-buttons">
              <Link className="btn btn-primary btn-large" to="/register?role=Requester">
                {vi.landing.need}
                <ArrowRight size={19} />
              </Link>
              <Link className="btn btn-outline btn-large" to="/register?role=Helper">
                <HandHeart size={20} />
                {vi.landing.help}
              </Link>
            </div>
            <div className="hero-trust">
              <div className="avatar-stack">
                {['HA', 'QV', 'LH', 'MT'].map((name, index) => (
                  <span key={name} className={`mini-avatar av-${index}`}>
                    {name}
                  </span>
                ))}
              </div>
              <div>
                <strong>{vi.landing.trust}</strong>
                <span>
                  <ShieldCheck size={13} />
                  {vi.landing.verified}
                  <i />
                  {vi.landing.noFees}
                </span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-orbit" />
            <span className="visual-leaf">
              <Leaf size={35} />
            </span>
            <div className="hero-photo">
              <img src={`${import.meta.env.BASE_URL}images/community.jpg`} alt={vi.landing.photoCaption} fetchPriority="high" />
              <div className="photo-shade" />
              <div className="photo-caption">
                <span>
                  <Heart fill="currentColor" size={15} />
                  {vi.landing.small}
                </span>
                <p>{vi.landing.photoCaption}</p>
              </div>
            </div>
            <div className="floating-card">
              <span className="floating-icon">
                <HandHeart size={27} />
              </span>
              <div>
                <strong>{vi.landing.floatTitle}</strong>
                <span>{vi.landing.floatBody}</span>
              </div>
              <span className="float-check">
                <Check size={15} />
              </span>
            </div>
            <div className="floating-pill">
              <span className="pulse-dot" />
              {vi.landing.floatStatus}
            </div>
            <span className="hero-sparkle">
              <Sparkles size={40} />
            </span>
          </div>
        </div>
      </section>
      <section className="stats-strip">
        <div className="container stats-inner">
          {[stats?.completedRequests, stats?.helpers, stats?.openRequests].map((value, i) => (
            <div className="stat-item" key={i}>
              <strong>
                {value === undefined ? '—' : value.toLocaleString('vi-VN')}
                <span>+</span>
              </strong>
              <span>{vi.landing.stats[i]}</span>
            </div>
          ))}
          <div className="stats-message">
            <HeartHandshake size={30} />
            <p>{vi.landing.statsNote}</p>
          </div>
        </div>
      </section>
      <CategoryExplorer />
      <CommunityFinder />
      <section className="problem-section" id="about">
        <div className="container problem-grid">
          <div className="story-visual">
              <img src={`${import.meta.env.BASE_URL}images/helping.jpg`} alt={vi.landing.problemTitle} loading="lazy" />
            <div className="story-note">
              <Heart className="text-primary" size={22} />
              <p>
                {vi.landing.floatBody}
                <span>{vi.slogan}</span>
              </p>
            </div>
            <span className="story-dots" />
          </div>
          <div className="problem-copy">
            <div className="eyebrow">{vi.landing.problemEyebrow}</div>
            <h2>{vi.landing.problemTitle}</h2>
            <p>{vi.landing.problemBody}</p>
            <ul>
              {vi.landing.problems.map((text) => (
                <li key={text}>
                  <span>
                    <CheckCheck size={17} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <Link className="text-link" to="/register">
              {vi.nav.join}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section how-section" id="how-it-works">
        <div className="container">
          <div className="section-heading centered">
            <div className="eyebrow">{vi.landing.howEyebrow}</div>
            <h2>{vi.landing.howTitle}</h2>
            <p>{vi.landing.howLead}</p>
          </div>
          <div className="steps-grid">
            {vi.landing.steps.map((step, i) => {
              const Icon = stepIcons[i];
              return (
                <article className="step-card" key={step.title}>
                  <div className="step-icon">
                    <Icon size={28} strokeWidth={1.6} />
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                  {i < 3 && <ArrowRight className="step-arrow" size={22} />}
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="section benefits-section">
        <div className="container">
          <div className="section-heading centered">
            <div className="eyebrow">{vi.landing.benefitEyebrow}</div>
            <h2>{vi.landing.benefitTitle}</h2>
          </div>
          <div className="benefits-grid">
            {vi.landing.benefits.map((benefit, i) => {
              const Icon = [HeartHandshake, CircleCheck, ShieldCheck][i];
              return (
                <article key={benefit.title}>
                  <span className={`benefit-icon benefit-${i}`}>
                    <Icon size={29} strokeWidth={1.6} />
                  </span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="final-cta">
        <div className="container">
          <div className="cta-inner">
            <span className="cta-ring ring-one" />
            <span className="cta-ring ring-two" />
            <div className="cta-content">
              <div className="eyebrow">{vi.landing.finalEyebrow}</div>
              <h2>{vi.landing.finalTitle}</h2>
              <p>{vi.landing.finalBody}</p>
              <Link className="btn btn-white btn-large" to="/register">
                {vi.landing.finalCta}
                <ArrowUpRight size={19} />
              </Link>
              <small>{vi.landing.finalNote}</small>
            </div>
            <HandHeart className="cta-heart" size={170} strokeWidth={0.8} />
          </div>
          <div className="safety-footer">
            <ShieldCheck size={16} />
            {vi.landing.safety}
          </div>
        </div>
      </section>
    </main>
  );
}
