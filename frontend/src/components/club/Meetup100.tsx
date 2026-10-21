import type { ReactNode } from 'react'
import Link from 'next/link'
import { ClubPage } from './ClubPage'
import { Timeline } from './Timeline'
import { StoryPhotos } from './StoryPhotos'
import { StoryLightboxProvider } from './StoryLightbox'

const SUBSTACK_URL = 'https://brokebibliophilesbangalore.substack.com/p/breaking-bbb-completes-100-meetups'

/** An external link inside a paragraph: the "link" class, but it stays in the text flow. */
function ext(href: string, children: ReactNode) {
  return (
    <a className="link" style={{ display: 'inline', minHeight: 0 }} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export function Meetup100() {
  return (
    <ClubPage kind="crumb" crumbs={[{ href: '/directory', label: 'Directory' }, { href: '/meetups', label: 'Meetups' }, { label: '#100' }]} tab="dir">
      <div className="sp32" />
      <h1 className="h1">Meetup #100</h1>
      <p className="body" style={{ marginTop: 8 }}>11 Oct 2026 &middot; Samagata Foundation, Church Street, Bangalore</p>
      <p className="cap" style={{ marginTop: 4 }}>28 photos from the day, three moments &middot; plus the story in 26 pictures and a video</p>
      <p className="body" style={{ marginTop: 12 }}>An author spoke about his book, then there were games.</p>

      <nav className="jump" aria-label="On this page" style={{ marginTop: 16 }}>
        <a href="#story">The story</a>
        <a href="#author-session">Author session</a>
        <a href="#bingo">Book Bingo &amp; video</a>
        <a href="#moments">Three moments</a>
      </nav>

      {/* The Substack story, told by Abhiram Ramesh, with the pictures from the post. */}
      <StoryLightboxProvider>
        <article className="story" id="story" style={{ marginTop: 32 }}>
          <p className="eyebrow">The story &middot; 20 Oct 2026 &middot; by Abhiram Ramesh</p>
          <h2 className="sech" style={{ marginTop: 4 }}>Breaking: BBB completes 100 meetups</h2>
          <p className="cap" style={{ marginTop: 4, fontStyle: 'italic' }}>Creator of group left amazed. Still can&rsquo;t believe how far they&rsquo;ve come.</p>

          <p className="body" style={{ marginTop: 16 }}>
            This edition is a special one. It&rsquo;s the one I&rsquo;m writing a week after we, <b>Broke Bibliophiles Bangalore</b>, completed <b>One Hundred meetups</b>.
          </p>
          <p className="body"><b>One Hundred. 100.</b></p>
          <p className="body">It still feels surreal to be able to say that.</p>
          <p className="body">
            The fact that we gathered a group of like-minded people and met up a hundred times to discuss books and all things reading. To be able to say that we started in 2017 and almost a decade later, we&rsquo;re still going strong.
          </p>
          <p className="body">
            And none of this would have been possible without our community. I think a little back-story is in order for those who couldn&rsquo;t make it to the meetup. And bear with me :) This is going to be a bit of a long one -
          </p>

          <h3 className="sech sub">How it started (2017)</h3>
          <p className="body">
            When we started, it was just myself i.e. <b>Abhiram Ramesh</b> and my dear friend, <b>Radhika Chauhan</b>. We reached out to a handful of our friends and created a group on Facebook called &ldquo;<b>Broke Bibliophiles Bangalore</b>&rdquo;, mimicking our older sister groups <b>Broke Bibliophiles Delhi</b> and <b>Broke Bibliophiles Bombay</b>. At that point, we had no idea what shape it would take or what to even do with a group. All I knew was that we were not alone in being readers.
          </p>
          <p className="body">Our very first &ldquo;unofficial&rdquo; meetup was at the Basava Bhavan Books by Weight event. Post-which we went for lunch -</p>

          <StoryPhotos group="first" />

          <p className="body">The seed was planted.</p>
          <p className="body">
            We then reached out to different cafes and venues in our search for a place to conduct our first &ldquo;official&rdquo; meetup. The one place that welcomed us with open arms was this (now-not-so) little book cafe you might have heard of - {ext('https://www.attagalatta.com/', 'Atta Galatta')}. I still remember walking in and Palgun, who was managing things at Atta Galatta at the time, heard my &ldquo;pitch&rdquo; for all of 5 minutes and asked me what time I needed space and how many people I was expecting and said - <i>&ldquo;Yeah, sure man! Come off&rdquo;</i> - in classic <i>&ldquo;Namma Bengaluru&rdquo;</i> fashion. After that, I eventually met Lakshmi ma&rsquo;am and Subodh sir, cofounders of Atta Galatta were just as lovely as their establishment itself and they&rsquo;ve been staunch champions and friends of Broke Bibliophiles Bangalore since. :)
          </p>
          <p className="body">So we put the word out. And people came.</p>

          <StoryPhotos group="official" />

          <p className="body">
            <b>We&rsquo;ve experimented with a lot of different ways in which to run, by the way. This pic above was from our first meetup where we initially did a silent reading hour followed by discussions. We should probably bring that back sometime.</b>
          </p>
          <p className="body">
            Now I&rsquo;ve been a software engineer since 2011, and was also a {ext('https://bangalore.pythonindia.org/', 'Bangpypers')} co-organizer in 2017, so I knew that the first thing any community needs is a website &#128512; So I registered and created {ext('https://brokebibliophilesbangalore.com', 'brokebibliophilesbangalore.com')} in 2018. It was a ratty Jekyll website at the time because I was primarily a backend/data engineer. So my UI skills were a little less than passable. But it got the word out.
          </p>
          <p className="body">
            Till today, I still hear that a lot of people found us because of our website - when they searched for &ldquo;Book Clubs in Bangalore&rdquo;. (Back in the day anyway. Now it&rsquo;s just rife with AI results) .
          </p>

          <h3 className="sech sub">The online years (2020&ndash;2021)</h3>
          <p className="body">
            When everything was running smoothly till 2020, with mostly-regular meetups, Covid hit and our entire modus operandi went for a toss, because no one was going outside. So we did the next best thing. We went online. I still remember writing a note on &ldquo;How we ran our book club online&rdquo; as a guiding principle for other bookclubs to adopt. If you&rsquo;d like to read it, {ext('https://gist.github.com/abhiramr/9f9f202aae9c6dc7878633f425a8a285', 'here you go')}.
          </p>

          <StoryPhotos group="online" />
          <StoryPhotos group="notes" />
          <StoryPhotos group="online-more" />

          <h3 className="sech sub">Home at The Bookworm &amp; meetup #75</h3>
          <p className="body">
            Then after a couple of summers and one winter&rsquo;s worth of online meetups (that we thought would be ultimate fate), the Covid waves minorly subsided and in September 2021, we felt ready to resume our first post-covid meetup outside.
          </p>
          <p className="body">But where?</p>
          <p className="body">
            Atta Galatta had temporarily closed its shutters on its Koramangala branch and the {ext('https://maps.app.goo.gl/h7wjbCXMg8fsSxLW6', 'Indiranagar branch we know today')} hadn&rsquo;t started yet.
          </p>
          <p className="body">
            That&rsquo;s when one of our long-time supporters and bookish-haunt favorites stepped in and offered to host us - <b>Krishna sir</b> of {ext('https://thebookworm.co.in/', 'The Bookworm, Church Street, Bangalore')}.
          </p>
          <p className="body">Thus began our second phase of physical meetups and a home-away-from-home we&rsquo;ve been conducting our meetups since at.</p>
          <p className="body">
            Now at this time, we were still &ldquo;masking up&rdquo;. But hey, we were now able to see each other in person! And to be able to meetup in real life was a delight. We had taken it for granted it seemed. Never again.
          </p>

          <StoryPhotos group="bookworm" />

          <p className="body">
            Since then we&rsquo;ve been extremely regular with our meetups, courtesy - many of our regular bookclub members and a few bookclub members who stepped up to help me co-organize the meetups in my absence and to help manage the social media for BBB - <b>Vinay Leo</b> and <b>Leah Verghese</b> :)
          </p>

          <StoryPhotos group="organisers" />

          <p className="body">
            Our first momentous milestone that we celebrated was our <b>75th meetup in Oct 2024</b>! I got T-Shirts printed for everyone and folks were super excited!
          </p>

          <StoryPhotos group="seventyfive" />

          <h3 className="sech sub">Meetup #100</h3>
          <p className="body">And we continued.</p>
          <p className="body"><b>Aaaalll the way on 11th Oct 2026 to Meetup # 100. :)</b></p>
          <p className="body">
            Both the 75th and the 100th meetups were conducted at <b>Samagata Foundation</b> on Church street and I&rsquo;d like to, on behalf of the entire bookclub, sincerely thank them for accommodating us. Mr. Wilson was at the place the whole time both times and helped us out a lot, and for that, I am truly grateful.
          </p>
          <p className="body">
            We did a longer round of introductions this time, with each of us talking about how we first came to the book club and what sort of books we generally liked to read.
          </p>
          <p className="body">
            This trip down memory lane was extremely cathartic, at least for me. Because when you&rsquo;re inching towards a milestone, you tend to focus so much on getting there that you almost forget everything it took to reach that point. It takes a moment of conscious reflection to remember the journey, and hearing it recounted from perspectives other than your own is an entirely different feeling.
          </p>
          <p className="body">
            There were stories and memories I hadn&rsquo;t thought about in years, and others I hadn&rsquo;t even known about. Somewhere along the way, what had been my experience of BBB became a collection of everyone else&rsquo;s experiences too.
          </p>
          <p className="body">
            I personally loved hearing about the place Broke Bibliophiles Bangalore had come to occupy in people&rsquo;s lives. It was one thing to know that people kept coming back. It was quite another to hear, in their own words, what kept bringing them back.
          </p>

          <h3 className="sech sub" id="author-session">Author session: Sairam Krishnan</h3>
          <p className="body">
            We followed this round of introductions with an author meetup and discussion session. It was a personal joy to host {ext('https://x.com/_sairamkrishnan', <b>Sairam Krishnan</b>)}, who I&rsquo;ve known as a friend for a while, and has now launched his own book - {ext('https://www.amazon.in/Super-Cool-Startup-Early-stage-Marketing/dp/9379859805', <b>&ldquo;Super Cool Startup&rdquo;</b>)}. We primarily discussed his journey towards publishing the book, the value of personal relationships, the importance of consistent writing and a lot more. We also spoke about the role of marketing in writing and publishing and the role of AI in the field, if any and riffed quite a bit about the latter &#128512; . He also signed a lot of copies of the book for us :) If you care even remotely about Marketing, you should follow him and read the book!
          </p>

          <StoryPhotos group="author" />

          <h3 className="sech sub" id="bingo">Book Bingo &amp; the winners</h3>
          <p className="body">We wound the discussion up with a Book Bingo game I&rsquo;d created and people had a lot of fun with that as well &#128521;</p>

          <StoryPhotos group="bingo" />

          <figure style={{ margin: '20px 0 0' }}>
            <video
              controls
              playsInline
              preload="metadata"
              poster="/meetup100/meetup100-video-poster.png"
              style={{ width: '100%', maxHeight: 520, display: 'block', background: '#000' }}
            >
              <source src="/meetup100/meetup100-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <figcaption className="cap" style={{ marginTop: 8, textAlign: 'center' }}>
              Video from the 100th Meetup celebration at Samagata Foundation
            </figcaption>
          </figure>

          <p className="body" style={{ marginTop: 20 }}>So that&rsquo;s the journey so far :)</p>
          <p className="body">I hope you&rsquo;ve been a part of it.</p>
          <p className="body">And if not, see you in <b>Broke Bibliophiles Bangalore 101</b> :)</p>
          <p className="body">To all the friends I&rsquo;ve made along the way. Thank you.</p>
          <p className="body">You made this happen.</p>
          <p className="body" style={{ fontStyle: 'italic' }}>
            Sincerely,
            <br />
            <b>Abhiram.</b>
            <br />
            Creator. Member. Reader &mdash; Broke Bibliophiles Bangalore
          </p>

          <StoryPhotos group="group" />
        </article>
      </StoryLightboxProvider>

      <div className="sp32" />
      <div id="moments" style={{ borderTop: '2px solid var(--ink)', paddingTop: 24 }}>
        <p className="eyebrow">28 Photos &middot; Three Moments</p>
        <h2 className="h2" style={{ marginBottom: 16 }}>The 100th, in three moments</h2>
        <Timeline />
      </div>

      <div style={{ borderTop: '1px solid var(--line2)', paddingTop: 24 }}>
        <p className="h2">That was the 100th.</p>
        <p className="cap" style={{ marginTop: 6 }}>
          Picture credits: Amit Charles aka Candid King &amp; Darshan alias Selfie Star.
        </p>
        <div className="sp16" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <a className="btn" href={SUBSTACK_URL} target="_blank" rel="noopener">
            <span>Read on Substack</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
          <a className="btn" href="https://brokebibliophilesbangalore.substack.com" target="_blank" rel="noopener">
            <span>Subscribe for the next one</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <div className="sp16" />
        <Link className="link" href="/meetups/99">&larr; Meetup #99</Link>
      </div>
    </ClubPage>
  )
}
