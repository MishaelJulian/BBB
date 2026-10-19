import Link from 'next/link'

// Our own pixel drawings: the Gandabherunda (double-headed bird of the Karnataka emblem) and the Vidhana Soudha.
const BIRD = ['00110000000000001100', '01111000000000011110', '01111100000000111110', '00111110000001111100', '00011111111111111000', '00001111111111110000', '01111111111111111110', '11111111111111111111', '11101111111111110111', '11000111111111100011', '10000011111111000001', '00000001111110000000', '00000001100110000000', '00000011000011000000']
const SOUDHA = ['00000000011000000000', '00000000111100000000', '00000001111110000000', '00000011111111000000', '00110011111111001100', '01111011111111011110', '11111111111111111111', '11011011011011011011', '11011011011011011011', '11111111111111111111', '11111111111111111111']

function Art({ rows, cell = 2 }: { rows: string[]; cell?: number }) {
  return (
    <svg viewBox={`0 0 ${rows[0].length * cell} ${rows.length * cell}`} fill="#f3e7c9" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((r, j) => [...r].map((c, i) => (c === '1' ? <rect key={`${i}-${j}`} x={i * cell} y={j * cell} width={cell} height={cell} /> : null)))}
    </svg>
  )
}

function PostMark() {
  return (
    <svg className="pm" viewBox="0 0 92 92" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="46" cy="46" r="43" strokeWidth="1.6" />
      <circle cx="46" cy="46" r="30" strokeWidth="1.2" />
      <defs>
        <path id="pm-t" d="M10 46a36 36 0 0 1 72 0" />
        <path id="pm-b" d="M10 46a36 36 0 0 0 72 0" />
      </defs>
      <text fontSize="9" fontWeight="600" fill="currentColor" stroke="none" letterSpacing="1.4"><textPath href="#pm-t" startOffset="50%" textAnchor="middle">BENGALURU</textPath></text>
      <text fontSize="8.5" fontWeight="600" fill="currentColor" stroke="none" letterSpacing="1.6"><textPath href="#pm-b" startOffset="50%" textAnchor="middle">560 001</textPath></text>
      <text x="46" y="50" fontSize="11" fontWeight="700" fill="currentColor" stroke="none" textAnchor="middle" letterSpacing="1.5">BBB</text>
    </svg>
  )
}

export function Envelope({ href, kind, title, lines, val, cachet, cta, label }: { href: string; kind: 'bird' | 'soudha'; title: string; lines: string[]; val: string | number; cachet?: boolean; cta: string; label: string }) {
  return (
    <Link className="env" href={href} aria-label={label}>
      <span className="from">From: BBB, Bookworm, Church Street<b>ಬೆಂಗಳೂರು</b></span>
      <span className="stamp" aria-hidden="true">
        <span className="sf"><span className="hd">भारत INDIA</span><Art rows={kind === 'bird' ? BIRD : SOUDHA} /><span className="val">{val}</span></span>
      </span>
      <PostMark />
      <div className="addr">
        <p className="to"><small>To</small>{title}</p>
        {lines.map((l) => <p key={l}>{l}</p>)}
      </div>
      <div className="pinrow">
        <span>PIN</span>
        {['5', '6', '0', '0', '0', '1'].map((d, i) => <i key={i}>{d}</i>)}
        {cachet && <em className="cachet" aria-hidden="true">Special cover<br />BBB #100<br />11.10.2026</em>}
      </div>
      <div className="orow"><span className="open">{cta} <span aria-hidden="true">&rsaquo;</span></span></div>
    </Link>
  )
}
