"""Stage 5.8 and 6-7: compare parsed items with the database and record what has to change.

`reconcile` works on an open sqlite3 connection inside a transaction owned by the caller. The caller rolls back for a
dry run (the staging diff) or commits after review. Each decision is returned as an `Op` with its evidence, so the report
says why, not only what. Nothing here talks to the network.
"""
from __future__ import annotations

import os
import re
import sqlite3
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Optional

from app.parsers.meetup_parser import PARSER_VERSION, ParsedSource
from app.parsers.resolve import BookMatcher, MemberResolver, heading_key, name_like, norm_title


@dataclass
class Op:
    kind: str                 # add_mention | attach_reader | move_mention | link_import_row | new_book | new_member | attendance | unresolved | skip
    meetup: int
    heading: Optional[str]
    title: str
    detail: str


def _one(c, sql, a=()):
    r = c.execute(sql, a).fetchone()
    return r[0] if r else None


def n3(t: str) -> str:
    return " ".join(norm_title(re.sub(r"\s*\([^()]*\)\s*$", "", t.split(", by ")[0].split(" by ")[0])).split()[:3])


def load_world(c: sqlite3.Connection) -> tuple[dict, list]:
    members = {r[1]: r[0] for r in c.execute("select id, display_name from members")}
    books = [(r[0], r[1], r[2] or "", r[3] or "book") for r in c.execute("select b.id, b.title, a.full_name, b.media_type from canonical_books b left join authors a on a.id = b.author_id")]
    return members, books


def learn_evidence(c: sqlite3.Connection, parsed: list[tuple[ParsedSource, int]]) -> dict[str, Counter]:
    """heading key -> Counter(display_name) from items whose book already has a named reader at that meetup."""
    by = defaultdict(lambda: defaultdict(set))
    for mn, t, m in c.execute("select mt.meetup_number, b.title, m.display_name from discussions d join canonical_books b on b.id = d.canonical_book_id "
                              "join meetups mt on mt.id = d.meetup_id join members m on m.id = d.member_id"):
        by[mn][n3(t)].add(m)
    ev: dict[str, Counter] = defaultdict(Counter)
    for ps, mn in parsed:
        for it in ps.items:
            if it.section == "member" and it.heading:
                for m in by[mn].get(n3(it.title), ()):
                    ev[heading_key(it.heading)][m] += 1
    return ev


def _author(c, name: str) -> str:
    r = _one(c, "select id from authors where normalized_name = ?", (name.lower(),))
    if r:
        return r
    i = str(uuid.uuid4())
    c.execute("insert into authors(id, full_name, normalized_name, created_at, updated_at) values (?,?,?,datetime('now'),datetime('now'))", (i, name, name.lower()))
    return i


def _next_code(c, meetup: int) -> str:
    last = _one(c, "select max(cast(substr(member_code, 5) as integer)) from members where member_code like ?", (f"{meetup:03d}-%",)) or 0
    return f"{meetup:03d}-{last + 1:02d}"


def reconcile(c: sqlite3.Connection, ps: ParsedSource, meetup: int, resolver: MemberResolver, matcher: BookMatcher,
              source_name: Optional[str] = None, allow_guest: Optional[dict[str, str]] = None, allow_moves=False,
              allow_creators: Optional[set] = None) -> list[Op]:
    """Apply what `ps` says about `meetup`, inside the caller's transaction. Returns the ops (including skips and unresolved)."""
    c.row_factory = sqlite3.Row
    allow_guest = {heading_key(k): v for k, v in (allow_guest or {}).items()}
    allow_creators = {x.lower() for x in (allow_creators or set())}
    move_ok = lambda title: allow_moves is True or (meetup, n3(title)) in (allow_moves or set())
    ops: list[Op] = []
    mt = _one(c, "select id from meetups where meetup_number = ?", (meetup,))
    if mt is None:
        raise LookupError(f"meetup {meetup} does not exist")
    src_id = _one(c, "select id from sources where file_path = ?", (source_name or os.path.basename(ps.path),))
    fallback_src = src_id or _one(c, "select source_id from discussions where meetup_id = ? and source_id is not null limit 1", (mt,))
    if src_id:
        c.execute("update sources set meetup_number = ?, importer_name = ? where id = ?", (meetup, PARSER_VERSION, src_id))
    imps = c.execute("select id, raw_title, canonical_book_id from imported_books where source_id = ?", (src_id,)).fetchall() if src_id else []
    resolved: dict[str, Optional[str]] = {}
    why: dict[str, object] = {}
    lists: dict[str, set] = defaultdict(set)                      # title key -> members who list it in THIS file
    for it in ps.items:
        if it.section == "member" and it.heading and it.heading not in resolved:
            r = resolver.resolve(it.heading)
            if r.member_id is None and heading_key(it.heading) in allow_guest:
                name = allow_guest[heading_key(it.heading)]
                mid = str(uuid.uuid4())
                c.execute("insert into members(id, display_name, normalized_name, created_at, updated_at, status) values (?,?,?,datetime('now'),datetime('now'),'guest')", (mid, name, name.lower()))
                resolver.add_member(name, mid)
                ops.append(Op("new_member", meetup, it.heading, name, "heading names nobody in the club; created as guest (operator allow-list)"))
                r = resolver.resolve(it.heading)
            resolved[it.heading], why[it.heading] = r.member_id, r
    for it in ps.items:
        if it.section == "member" and resolved.get(it.heading):
            lists[n3(it.title)].add(resolved[it.heading])
    attended: set = set()
    for it in ps.items:
        title = it.title
        if "fragment" in it.flags:
            ops.append(Op("skip", meetup, it.heading, title, "fragment, not a book"))
            continue
        if "series" in it.flags:
            ops.append(Op("skip", meetup, it.heading, title, "a series mention: waits for the series table (no new book row)"))
            continue
        if re.search(r"(?i)book club", it.raw):
            ops.append(Op("skip", meetup, it.heading, title, "a club, not a book: left for the founder"))
            continue
        if any(f.startswith("dash in title") for f in it.flags):           # 'Title - Author', 'Author - Title' or a subtitle?
            left, right = [x.strip() for x in title.split(" - ", 1)]
            known = lambda n: bool(_one(c, "select 1 from authors where normalized_name = ?", (n.lower(),)))
            if name_like(right) and not (name_like(left) and known(left)):
                title, it.author = left, right
            elif name_like(left) and not name_like(right):
                title, it.author = right, left
            elif name_like(left) and name_like(right) and known(left) != known(right):
                title, it.author = (right, left) if known(left) else (left, right)
            elif not name_like(left) and not name_like(right):
                pass                                                       # a subtitle: the whole line is the title
            else:
                ops.append(Op("held_new_book", meetup, it.heading, title, "a ' - ' in the line and both sides read like names: title and author unclear"))
                continue
            it.flags = [f for f in it.flags if not f.startswith("dash in title")]
        member = None
        if it.section == "member":
            member = resolved.get(it.heading)
            if member is None:
                ops.append(Op("unresolved", meetup, it.heading, title, why[it.heading].how))
                continue
            if member not in attended:
                attended.add(member)
                if not _one(c, "select 1 from meetup_attendance where meetup_id = ? and member_id = ?", (mt, member)):
                    c.execute("insert into meetup_attendance(id, meetup_id, member_id, status, source, created_at, updated_at) values (?,?,?,'attended','backfill',datetime('now'),datetime('now'))", (str(uuid.uuid4()), mt, member))
                    nm = _one(c, "select display_name from members where id = ?", (member,))
                    ops.append(Op("attendance", meetup, it.heading, nm, why[it.heading].how + (" (inferred)" if why[it.heading].inferred else "")))
                if not _one(c, "select member_code from members where id = ?", (member,)):
                    c.execute("update members set member_code = ? where id = ?", (_next_code(c, meetup), member))
        pm = re.match(r"^Podcasts?:\s*(.+)$", title)
        titles = [(x.strip(), "podcast") for x in pm.group(1).split(",") if x.strip()] if pm else [(title, it.media_hint or ("website_app" if re.search(r"(?i)\bapp\b", title) else "book"))]
        for t, media in titles:
            same_raw = [i for i in imps if i["canonical_book_id"] and n3(i["raw_title"]) == n3(it.raw)] if not pm else []
            link = next((i for i in same_raw if _one(c, "select media_type from canonical_books where id = ?", (i["canonical_book_id"],)) == media), None) \
                or (same_raw[0] if len(same_raw) == 1 and _one(c, "select media_type from canonical_books where id = ?", (same_raw[0]["canonical_book_id"],)) == media else None)
            if link:
                bid, how = link["canonical_book_id"], "import row's book"
            else:
                ids, how = matcher.candidates(t, it.author, exact_only=(media != "book"), media=media)
                at_meetup = [i for i in ids if _one(c, "select 1 from discussions where meetup_id = ? and canonical_book_id = ?", (mt, i))]
                bid = (at_meetup or ids or [None])[0]               # among look-alike rows prefer the one already mentioned at this meetup
                if bid is None and str(how).startswith("CLASH:"):
                    ops.append(Op("held_new_book", meetup, it.heading, t, f"a book with this title exists with other author(s) ({how[6:]}); not attached, not duplicated: yours to decide"))
                    continue
            if bid is None and re.search(r"(?i)\b(series|saga|trilogy|chronicles|books)\b\s*$", t):
                ops.append(Op("skip", meetup, it.heading, t, "a series mention: waits for the series table (no new book row)"))
                continue
            if bid is None and any(f.startswith("dash in title") for f in it.flags):
                ops.append(Op("held_new_book", meetup, it.heading, t, "a ' - ' in the line: title and author may be the other way round; no row created"))
                continue
            if bid is None and (close := matcher.near(t)):
                bid, how = close[0], f"close spelling of '{close[1]}' (inferred)"
            if bid is None and any(f.startswith("dash in title") for f in it.flags):
                pass
            if bid is None and t.lower() in allow_creators:
                media = "creator"
            if bid is None and media == "book" and not it.author and re.fullmatch(r"[A-Z][a-z]+(?: [A-Z][a-z.]+){1,2}", t) and not re.search(r"(?i)\b(the|of|and|a)\b", t):
                ops.append(Op("held_new_book", meetup, it.heading, t, "the line is only a person's name: a creator, not a book? (decide)"))
                continue
            if bid is None:
                bid = str(uuid.uuid4())
                nt = f"{t} (tr. {it.translator})" if it.translator else t
                au = it.author if it.section != "author_discussion" else (it.heading or it.author)
                c.execute("insert into canonical_books(id, title, normalized_title, sort_title, author_id, language, media_type, created_at, updated_at) values (?,?,?,?,?,'en',?,datetime('now'),datetime('now'))",
                          (bid, nt, nt.lower(), nt, _author(c, au) if au else None, media))
                matcher.add(bid, nt, au or "", media)
                ops.append(Op("new_book", meetup, it.heading, nt, f"no existing book matches; media {media}" + (" (assumed)" if media == "book" and not it.media_hint else "")))
            ex = c.execute("select id, member_id from discussions where meetup_id = ? and canonical_book_id = ?", (mt, bid)).fetchall()
            status = None
            if (member is None and ex) or (member and any(e["member_id"] == member for e in ex)):
                pass          # a general mention of a book someone already discusses adds nothing
            else:
                orphan = [e for e in ex if e["member_id"] is None]
                other = [e for e in ex if e["member_id"] is not None]
                if member and orphan:
                    c.execute("update discussions set member_id = ? where id = ?", (member, orphan[0]["id"]))
                    status = ("attach_reader", "the mention existed with no reader; the heading names one")
                elif member and other and not (lists[n3(t)] - {member}) and not any(e["member_id"] in lists[n3(t)] for e in other):
                    if move_ok(t):
                        c.execute("update discussions set member_id = ? where id = ?", (member, other[0]["id"]))
                        status = ("move_mention", "the other reader's own list in this PDF does not contain it")
                    else:
                        who = _one(c, "select display_name from members where id = ?", (other[0]["member_id"],))
                        status = ("held_move", f"DB credits {who}; this heading resolves to a different member ({why[it.heading].how}); needs your approval (--allow-moves, or --allow-move MEETUP:TITLE for one)")
                else:
                    topic = f"Author discussion: {it.heading}" if it.section == "author_discussion" else None
                    c.execute("insert into discussions(id, meetup_id, canonical_book_id, member_id, topic, confidence_score, source_id, media_type, created_at, updated_at) values (?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))",
                              (str(uuid.uuid4()), mt, bid, member, topic, 0.9, fallback_src, _one(c, "select media_type from canonical_books where id = ?", (bid,))))
                    status = ("add_mention", f"book matched by {how}")
            for i in imps:
                if i["canonical_book_id"] is None and n3(i["raw_title"]) == n3(it.raw):
                    c.execute("update imported_books set canonical_book_id = ? where id = ?", (bid, i["id"]))
                    ops.append(Op("link_import_row", meetup, it.heading, t, "import row had no book"))
                    break
            if status:
                ops.append(Op(status[0], meetup, it.heading, t, status[1]))
    return ops


def invariants(c: sqlite3.Connection) -> list[str]:
    """What must hold after any import. Returns problems; empty means green."""
    bad = []
    if _one(c, "pragma integrity_check") != "ok":
        bad.append("integrity_check failed")
    if c.execute("pragma foreign_key_check").fetchall():
        bad.append("foreign_key_check found violations")
    if _one(c, "select count(*) from (select member_code from members where member_code is not null group by 1 having count(*) > 1)"):
        bad.append("duplicate member codes")
    if _one(c, "select count(*) from sources where meetup_number is null and file_path like '%.pdf'"):
        bad.append("a PDF source has no meetup number")
    if _one(c, "select count(*) from canonical_books b join members m on lower(m.display_name) = lower(b.title)"):
        bad.append("a book is titled like a member name (a heading imported as a book?)")
    return bad
