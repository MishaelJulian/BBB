// The ten media categories the club approved. The server keeps the authoritative list (media_categories table);
// this file only gives each code a label, an icon and the words the admin forms use for it.

export type MediaTypeOption =
  | 'book' | 'article' | 'movie' | 'tv_series' | 'anime' | 'documentary'
  | 'podcast' | 'video' | 'website_app' | 'poem'

export interface MediaMeta {
  id: MediaTypeOption
  label: string
  icon: string
  placeholder: string      // search box
  titleLabel: string       // "Movie / TV Show Title *"
  creatorLabel: string     // "Director / Studio / Network"
  creatorPlaceholder: string
  source: string           // where suggestions come from
  badgeClass: string
}

export const MEDIA_TYPES: MediaMeta[] = [
  { id: 'book', label: 'Book', icon: '📚', placeholder: 'e.g. Misery, Klara and the Sun, Dune...', titleLabel: 'Book Title *', creatorLabel: 'Author Name', creatorPlaceholder: 'e.g. Stephen King', source: 'Goodreads & BBB Archive', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'article', label: 'Article', icon: '📰', placeholder: 'Paste the article link or enter its title...', titleLabel: 'Article Title *', creatorLabel: 'Writer / Publication', creatorPlaceholder: 'e.g. Paul Graham', source: 'Web link resolver', badgeClass: 'bg-stone-100 text-stone-800 border-stone-200' },
  { id: 'movie', label: 'Movie', icon: '🎬', placeholder: 'e.g. The Last Emperor, Inception...', titleLabel: 'Movie Title *', creatorLabel: 'Director / Studio', creatorPlaceholder: 'e.g. Bernardo Bertolucci', source: 'Film search (DuckDuckGo)', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'tv_series', label: 'TV / web series', icon: '📺', placeholder: 'e.g. Succession, Kingdom...', titleLabel: 'Series Title *', creatorLabel: 'Creator / Network', creatorPlaceholder: 'e.g. Jesse Armstrong', source: 'TV search (TVMaze)', badgeClass: 'bg-violet-100 text-violet-800 border-violet-200' },
  { id: 'anime', label: 'Anime', icon: '🎌', placeholder: 'e.g. One Piece, Death Note...', titleLabel: 'Anime Title *', creatorLabel: 'Studio / Creator', creatorPlaceholder: 'e.g. Eiichiro Oda', source: 'TV search (TVMaze)', badgeClass: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  { id: 'documentary', label: 'Documentary', icon: '🎞️', placeholder: 'e.g. Turn Every Page...', titleLabel: 'Documentary Title *', creatorLabel: 'Director / Studio', creatorPlaceholder: 'e.g. Lizzie Gottlieb', source: 'Film search (DuckDuckGo)', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'podcast', label: 'Podcast', icon: '🎙️', placeholder: 'e.g. Huberman Lab, Hardcore History...', titleLabel: 'Podcast Title *', creatorLabel: 'Host / Network', creatorPlaceholder: 'e.g. Andrew Huberman', source: 'Apple Podcasts search', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'video', label: 'Video / YouTube', icon: '▶️', placeholder: 'Paste a YouTube link or enter a channel / video name...', titleLabel: 'Video / Channel Title *', creatorLabel: 'Channel / Creator', creatorPlaceholder: 'e.g. 3Blue1Brown', source: 'YouTube channels & videos', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'website_app', label: 'Website / app', icon: '🌐', placeholder: 'e.g. Wondrium, Substack, Tachiyomi...', titleLabel: 'Website / App Name *', creatorLabel: 'Creator / Platform', creatorPlaceholder: 'e.g. The Teaching Company', source: 'Web link resolver', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'poem', label: 'Poem', icon: '🪶', placeholder: 'e.g. Death Be Not Proud...', titleLabel: 'Poem Title *', creatorLabel: 'Poet', creatorPlaceholder: 'e.g. John Donne', source: 'BBB Archive', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
]

// Values saved before the switch; the server still accepts them, so old data and old links keep working.
const LEGACY: Record<string, MediaTypeOption> = { youtube: 'video', show: 'tv_series', tangent: 'website_app' }

export function normalizeMediaType(value?: string | null): MediaTypeOption {
  const v = (value || 'book').toLowerCase()
  return (LEGACY[v] || v) as MediaTypeOption
}

export function mediaMeta(value?: string | null): MediaMeta {
  const id = normalizeMediaType(value)
  return MEDIA_TYPES.find((m) => m.id === id) || MEDIA_TYPES[0]
}
