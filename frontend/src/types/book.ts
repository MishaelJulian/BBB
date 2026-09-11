export interface Book {
  id: string
  title: string
  normalized_title: string
  author?: Author
  discussion_count: number
  meetups: MeetupReference[]
  members: MemberReference[]
  resources: Resource[]
  created_at: string
}

export interface Author {
  id: string
  name: string
  normalized_name: string
}

export interface MeetupReference {
  id: string
  meetup_number: number
  date: string
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
