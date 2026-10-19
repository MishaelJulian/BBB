// Meetup photos are kept in storage (public bucket), not in the repo: the base is set by NEXT_PUBLIC_PHOTO_BASE.
// Local development can drop files in public/ui/photos (git-ignored).
const BASE = process.env.NEXT_PUBLIC_PHOTO_BASE ?? '/ui/photos'
export const photoSrc = (id: string, size: '800' | 'full') => `${BASE}/${id}-${size}.jpg`
