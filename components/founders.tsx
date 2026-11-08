import './landing.css';

const FOUNDERS = [
  { name: 'Lutfi Ghifari Hibban', initials: 'LG' },
  { name: 'Fijar Satria Pinandita Mangkauna', initials: 'FS' },
  { name: 'Abdul Jabbar Hawali Al Dzahabi', initials: 'AJ' },
];

/** Credit for the people who started PORSI LOOP. */
export function Founders({ className = '' }: { className?: string }) {
  return (
    <section className={`founders ${className}`} aria-labelledby="founders-title">
      <p className="eyebrow">DIBANGUN OLEH</p>
      <h2 id="founders-title">Para founder PORSI LOOP</h2>
      <ul>
        {FOUNDERS.map((person) => (
          <li key={person.name}>
            <span className="founder-avatar" aria-hidden="true">
              {person.initials}
            </span>
            <span>
              <strong>{person.name}</strong>
              <small>Founder · Trinity LFA</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
