// Photos from the Substack story "Breaking: BBB completes 100 meetups" (Broke Bibliophiles Bangalore Bulletin, 20 Oct 2026).
// The files live in the repo (public/meetup100/story), resized to a 1600 px long edge; this list is the caption and alt-text index.
// Alt text is factual and unnamed, like the rest of the archive; the people are named in the captions, as in the original post.
export interface StoryPhoto {
  id: string
  file: string
  w: number
  h: number
  alt: string
  group: string
}

export interface StoryGroup {
  id: string
  /** 'flow' = a landscape takes a full row and portraits pair up; 'pair' = every two photos share a row. */
  layout: 'flow' | 'pair'
  caption?: string
}

export const STORY_GROUPS: StoryGroup[] = [
  { id: 'first', layout: 'flow', caption: 'Ft. The earliest believers in the bookclub who’ve still stuck with us - Nishant Singh, Jagjot Cheema and Naga Teja. Thank you my dears :)' },
  { id: 'official', layout: 'flow', caption: 'Our first official meetup at Atta Galatta, where we started with a silent reading hour and then talked about books.' },
  { id: 'online', layout: 'flow' },
  { id: 'notes', layout: 'pair', caption: 'One of our particularly serious online meetups and the notes from it.' },
  { id: 'online-more', layout: 'flow', caption: 'More online meetups.' },
  { id: 'bookworm', layout: 'pair', caption: 'Meetups Sep and Oct 2021 at The Bookworm, Church Street.' },
  { id: 'organisers', layout: 'flow', caption: 'Leah and Vinay!' },
  { id: 'seventyfive', layout: 'pair', caption: 'Meetup #75 - Oct 2024!' },
  { id: 'author', layout: 'pair', caption: 'Sairam Krishnan and Super Cool Startup :)' },
  { id: 'bingo', layout: 'flow', caption: 'The game and the winners :D' },
  { id: 'group', layout: 'pair', caption: 'How it started --> How it’s going. Picture credits - Amit Charles aka Candid King, Darshan alias Selfie Star.' },
]

export const STORY: StoryPhoto[] = [
  { id: 's01', file: '01-first-lunch.jpg', w: 967, h: 723, alt: 'Friends at a lunch table after the club’s first unofficial meetup.', group: 'first' },
  { id: 's02', file: '02-first-official-attagalatta.jpg', w: 1116, h: 681, alt: 'Readers seated around a table at the club’s first official meetup.', group: 'official' },
  { id: 's03', file: '03-online-meetup.jpg', w: 1600, h: 729, alt: 'An online book club call with a grid of participant tiles.', group: 'online' },
  { id: 's04', file: '04-online-notes-1.jpg', w: 518, h: 715, alt: 'A page of handwritten notes from an online meetup.', group: 'notes' },
  { id: 's05', file: '05-online-notes-2.jpg', w: 794, h: 601, alt: 'Another page of handwritten notes from an online meetup.', group: 'notes' },
  { id: 's06', file: '06-online-notes-3.jpg', w: 953, h: 710, alt: 'A page of handwritten notes from an online meetup.', group: 'notes' },
  { id: 's07', file: '07-online-notes-4.jpg', w: 956, h: 712, alt: 'A page of handwritten notes from an online meetup.', group: 'notes' },
  { id: 's08', file: '08-online-notes-5.jpg', w: 995, h: 663, alt: 'A page of handwritten notes from an online meetup.', group: 'notes' },
  { id: 's09', file: '09-more-online.jpg', w: 1600, h: 789, alt: 'A video call grid from an online BBB meetup.', group: 'online-more' },
  { id: 's10', file: '10-bookworm-sep-2021.jpg', w: 1600, h: 1200, alt: 'Attendees in masks seated at The Bookworm for the first meetup after Covid.', group: 'bookworm' },
  { id: 's11', file: '11-bookworm-oct-2021.jpg', w: 1280, h: 960, alt: 'Attendees seated around tables at The Bookworm in October 2021.', group: 'bookworm' },
  { id: 's12', file: '12-leah.jpg', w: 1119, h: 1600, alt: 'A club member smiling at the camera.', group: 'organisers' },
  { id: 's13', file: '13-vinay.jpg', w: 884, h: 1600, alt: 'A club member standing with a stack of books.', group: 'organisers' },
  { id: 's14', file: '14-meetup75-group.jpg', w: 1600, h: 1200, alt: 'The group photo of the club’s 75th meetup.', group: 'seventyfive' },
  { id: 's15', file: '15-meetup75-tshirts.jpg', w: 1600, h: 1200, alt: 'Attendees wearing the custom t-shirts printed for the 75th meetup.', group: 'seventyfive' },
  { id: 's16', file: '16-sairam-speaking.jpg', w: 1280, h: 960, alt: 'The author speaking into a microphone at the 100th meetup.', group: 'author' },
  { id: 's17', file: '17-author-discussion.jpg', w: 1600, h: 1067, alt: 'The author talking with the circle during the author session.', group: 'author' },
  { id: 's18', file: '18-book-signing.jpg', w: 1600, h: 1067, alt: 'The author signing copies of his book for a member.', group: 'author' },
  { id: 's19', file: '19-book-cover.jpg', w: 900, h: 1074, alt: 'The cover of the book Super Cool Startup.', group: 'author' },
  { id: 's20', file: '20-bingo-game.jpg', w: 1280, h: 960, alt: 'A host running the Book Bingo game in front of a projector screen.', group: 'bingo' },
  { id: 's21', file: '21-bingo-winner-1.jpg', w: 960, h: 1280, alt: 'A Book Bingo winner holding an envelope beside the host.', group: 'bingo' },
  { id: 's22', file: '22-bingo-winner-2.jpg', w: 960, h: 1280, alt: 'A Book Bingo winner holding a certificate beside the host.', group: 'bingo' },
  { id: 's23', file: '23-bingo-winner-3.jpg', w: 960, h: 1280, alt: 'A Book Bingo winner holding a prize beside the host.', group: 'bingo' },
  { id: 's24', file: '24-bingo-winner-4.jpg', w: 960, h: 1280, alt: 'A Book Bingo winner posing with the host.', group: 'bingo' },
  { id: 's25', file: '25-meetup100-group.jpg', w: 1600, h: 1067, alt: 'The group photo of the 100th meetup at Samagata Foundation.', group: 'group' },
  { id: 's26', file: '26-how-it-started-going.jpg', w: 1031, h: 1080, alt: 'Two photos side by side: the club’s first meetup and its 100th.', group: 'group' },
]

export const storySrc = (p: StoryPhoto) => `/meetup100/story/${p.file}`
export const groupCaption = (id: string) => STORY_GROUPS.find((g) => g.id === id)?.caption
