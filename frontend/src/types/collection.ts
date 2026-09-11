export interface Collection {
  slug: string
  title: string
  description: string
  books: BookReference[]
  created_at: string
}

export interface BookReference {
  id: string
  title: string
  author?: string
}

export interface ArchiveManifest {
  archive_version: string
  generated_at: string
  total_meetups: number
  canonical_books: number
  imported_books: number
  authors: number
  venues: number
  discussions: number
  recommendations: number
  current_reads: number
  resources: number
  possible_duplicates: number
  source_files: string[]
}
