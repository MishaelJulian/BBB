import { revalidatePath } from 'next/cache'
import { audit } from '@/lib/audit'
import { memberRoute } from '@/lib/handlers'
import { HttpError } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Who can see my wishlist: { public: boolean }. Private is the default. The member is found by the login.
const put = memberRoute(async (tx, who, memberId, _p, body) => {
  if (typeof body.public !== 'boolean') throw new HttpError(422, 'public must be true or false.')
  const [before] = await tx<{ wishlist_public: boolean }[]>`select wishlist_public from members where id = ${memberId} for update`
  await tx`update members set wishlist_public = ${body.public}, updated_at = now() where id = ${memberId}`
  await audit(tx, who, 'member.wishlist_visibility', 'members', memberId, { wishlist_public: before?.wishlist_public }, { wishlist_public: body.public })
  return { public: body.public }
})

// Revalidate only after the change is committed, so the reader page cannot re-cache the old state.
// A private switch must show on the public reader page at once, not after the 60 s cache.
export const PUT: typeof put = async (...args) => {
  const res = await put(...args)
  if (res.ok) revalidatePath('/members/[id]', 'page')
  return res
}
