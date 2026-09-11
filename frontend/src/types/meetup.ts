export interface Meetup {
  id: string
  meetup_number: number
  date: string
  venue?: Venue
  format: 'IN_PERSON' | 'ONLINE'
  title?: string
  description?: string
  books_discussed: BookReference[]
  discussion_mentions: BookReference[]
  members: MemberReference[]
  resources: Resource[]
}

export interface Venue {
  id: string
  name: string
  city: string
}

export interface BookReference {
  id: string
  title: string
  author?: string
}

export interface MemberReference {
  id: string
  display_name: string
}

export interface Resource {
  id: string
  url: string
  title?: string
  type: 'GOODREADS' | 'EXTERNAL' | 'INTERNAL'
}
