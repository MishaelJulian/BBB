"""The meetup parser and its relation checks. Each test is one fault met in the real files (fixtures are cut from them)."""
import sqlite3
import textwrap
import uuid

import pytest

from app.parsers.changeset import invariants, reconcile
from app.parsers.meetup_parser import meetup_number_for, parse_file, split_title_author
from app.parsers.resolve import BookMatcher, MemberResolver


def parse(tmp_path, text, name="BBB sample.txt"):
    p = tmp_path / name
    p.write_text(textwrap.dedent(text).strip("\n") + "\n" + ("padding line to give layout detection enough text\n" * 12), encoding="utf-8")
    return parse_file(str(p))


def titles(ps, heading=None):
    return [i.title for i in ps.items if heading is None or i.heading == heading]


def test_heading_in_title_case_is_a_heading_not_part_of_the_reader_above(tmp_path):
    ps = parse(tmp_path, """
        BBB AUG 2025 - BOOKS DISCUSSED
        @The Bookworm, Church Street | 24-8-25
        DEEPTI S
          ● The Good Son, by You-Jeong Jeong
          ● The Color of Law, by Mark Gimenez
        Dr. CHAITANYA
          ● The Life of Chuck, by Stephen King
          ● Kari, by Amruta Patil
        PRADEEP
          ● Magnificent Delusions, by Husain Haqqani
    """)
    assert titles(ps, "Dr. CHAITANYA") == ["The Life of Chuck", "Kari"]
    assert titles(ps, "DEEPTI S") == ["The Good Son", "The Color of Law"]


def test_wrapped_author_name_joins_the_item_and_is_not_a_heading(tmp_path):
    ps = parse(tmp_path, """
        BBB JAN 2026 - BOOKS DISCUSSED LIST
        @The Bookworm
        SINDHUJA
          ● Emily Wilde’s Map of the Otherlands, by Heather Fawcett
        MENTIONS
         ●  The Boy, The Mole, The Fox and The Horse, by Charlie
            Mackesy
         ●  Coolie, by Mulk Raj Anand
    """)
    assert "Mackesy" not in {i.heading for i in ps.items}
    boy = next(i for i in ps.items if i.title.startswith("The Boy"))
    assert boy.author == "Charlie Mackesy"


def test_url_lines_and_their_wrapped_tails_are_never_items(tmp_path):
    ps = parse(tmp_path, """
        BBB OCT 24
        @The Bookworm, Church Street, 27-10-2024
        TANGENTS
          ●  The Village by the Sea (Anita Desai)
             https://www.goodreads.com/book/show/275600.The_Village_by_the_S
             ea
          ●  Ghachar Ghochar (Vivek Shanbhag)
             https://www.goodreads.com/book/show/28237175-ghachar-ghochar
    """)
    assert titles(ps) == ["The Village by the Sea", "Ghachar Ghochar"]
    assert ps.items[0].goodreads_url.endswith("Sea")


def test_inline_url_is_cut_from_the_title(tmp_path):
    ps = parse(tmp_path, """
        BBB AUG 24
        @The Bookworm, 25-08-2024
        Tangents
           ● White Nights (Dostoyevsky) https://www.goodreads.com/book/show/1772910.White_Nights
           ● Akbar (Ira Mukhoty) https://www.goodreads.com/book/show/51745971-akbar
    """)
    assert titles(ps) == ["White Nights", "Akbar"]


def test_table_columns_never_glue_the_author_onto_the_title(tmp_path):
    hdr = "Title".ljust(99) + "Author".ljust(16) + "Type".ljust(12) + "Link"
    rows = ["Trick Mirror: Reflections on Self-Delusion".ljust(99) + "Jia Tolentino".ljust(16) + "Book".ljust(12) + "https://x",
            "The Midnight Library".ljust(99) + "Matt Haig".ljust(16) + "Book".ljust(12) + "https://x"]
    ps = parse(tmp_path, "\n".join([hdr] + rows))
    assert ps.layout == "table"
    assert titles(ps)[:2] == ["Trick Mirror: Reflections on Self-Delusion", "The Midnight Library"]
    assert ps.items[0].author == "Jia Tolentino"


def test_a_title_filling_the_table_column_is_flagged_as_possibly_cut(tmp_path):
    hdr = "Title".ljust(99) + "Author".ljust(16) + "Type".ljust(12) + "Link"
    long = "The Horse, the Wheel, and Language: How Bronze-Age Riders from the Eurasian Steppes Shaped the Modern"
    ps = parse(tmp_path, "\n".join([hdr, long.ljust(99) + "David W.".ljust(16) + "Book"]))
    assert "title may be cut at the column edge" in ps.items[0].flags


def test_glued_mid_line_bullets_split_and_a_wrapped_title_stays_whole(tmp_path):
    ps = parse(tmp_path, """
        BBB Meetup, 26/8/2023
        ∙ American Prometheus: The Triumph and Tragedy of J Robert
        Oppenheimer (Kai Bird and Martin Sherwin)
        https://www.goodreads.com/book/show/59524291-american
        ∙ In Search of Lost Time (Marcel Proust)
        https://www.goodreads.com/book/show/13329904 ∙ I, Claudius (Robert Graves)
        https://www.goodreads.com/book/show/820462.I_Claudius ∙ Temple (Matthew Reilly)
        https://www.goodreads.com/book/show/128874397-temple ∙ Contest (Matthew Reilly)
    """)
    assert ps.layout == "glued_bullets"
    assert titles(ps)[0] == "American Prometheus: The Triumph and Tragedy of J Robert Oppenheimer"
    assert "Oppenheimer" not in titles(ps)


def test_numbered_name_followed_by_bullets_is_a_heading(tmp_path):
    ps = parse(tmp_path, """
        BBB - Meet-up 71 (28 apr 24)
         1) Smriti
         • cockpit confidence by Patrick Smith
         • Book thief by Markus zusak
         2) Anindita
         • Dark places by Gillian Flynn
    """)
    assert [i.heading for i in ps.items][:3] == ["Smriti", "Smriti", "Anindita"]


def test_a_page_number_between_a_heading_and_its_items_is_ignored(tmp_path):
    ps = parse(tmp_path, """
        BBB - Meet-up 71 (28 apr 24)
         10) Leah
         • Short history of tractors in Ukrainian
         11) Deepti
                                          1
         • The women by Kristin Hannah
         • The missing file by D A Mishani
    """)
    assert [i.heading for i in ps.items if i.title.startswith("The")] == ["Deepti", "Deepti"]


def test_title_dash_author_file_splits_at_the_dash(tmp_path):
    ps = parse(tmp_path, """
        BBB-82 | 30th March 2025
        Jyothi
        1. The Perfect Murder - H. R. F. Keating
        2. Maigret and the Wine Merchant - Georges Simenon
        3. Murder at Maybridge Castle - Ada Moncrieff
        Chaitanya
        1. Brave New World - Aldous Huxley
        2. Best Served Cold - Joe Abercrombie
        3. Do Androids Dream of Electric Sheep? - Philip K. Dick
    """)
    assert titles(ps, "Chaitanya")[0] == "Brave New World" and ps.items[0].author == "H. R. F. Keating"


def test_second_view_of_the_same_books_is_not_parsed_twice(tmp_path):
    ps = parse(tmp_path, """
        Meeting #80 - BBB Jan 2025
        Books Categorized by Person:
               Shivankar:
                     Agatha Raisin by Marion Chesney
               Madhu:
                     One Part Woman by Perumal Murugan
        Books Categorized by Genre:
               Mystery:
                     Agatha Raisin by Marion Chesney
    """)
    assert titles(ps).count("Agatha Raisin") == 1


def test_meetup_number_comes_from_the_filename_else_the_month_never_a_guess():
    by_month = {(2025, 8): 87, (2025, 11): 90}
    assert meetup_number_for("/x/BBB AUG 2025 - BOOKS DISCUSSED.pdf", [], by_month) == (87, "month-year")
    assert meetup_number_for("/x/BBB #93 Feb 2026, Books Discussed.pdf", [], by_month)[0] == 93
    assert meetup_number_for("/x/BBB Mystery.pdf", [], by_month)[0] is None


def test_translator_and_media_cues_are_lifted_out_of_the_title():
    p = split_title_author("Bhima, by MT Vasudevan Nair, translated from Malayalam by Gita Krishnankutty")
    assert (p["title"], p["translator"]) == ("Bhima", "Gita Krishnankutty")
    assert split_title_author("The King Speech (Movie)")["media"] == "movie"
    assert split_title_author("The Lunch Box, movie")["media"] == "movie"


MEMBERS = {n: str(uuid.uuid4()) for n in ["Aravind", "Aravind S", "Aravind C", "Anand", "Anand Ganapathy", "John Raju", "John Benedict",
                                          "Deepak", "Deepak T", "Darshan", "Chaitanya", "Madhusudan", "Jyothi", "Amel"]}


def test_heading_resolution_tiers_and_refusal_to_guess():
    from collections import Counter
    r = MemberResolver(MEMBERS, evidence={"deepak varadaraj": Counter({"Deepak": 12})})
    name = {v: k for k, v in MEMBERS.items()}
    assert name[r.resolve("ARAVIND .S").member_id] == "Aravind S"
    assert name[r.resolve("ANAND .G").member_id] == "Anand Ganapathy"
    assert name[r.resolve("DEEPAK VARADARAJ").member_id] == "Deepak"          # alias evidence
    assert name[r.resolve("Dr. CHAITANYA").member_id] == "Chaitanya"
    assert name[r.resolve("DARSHAN K").member_id] == "Darshan"
    assert name[r.resolve("AMEL A R").member_id] == "Amel"
    assert name[r.resolve("MADHUSUDHAN").member_id] == "Madhusudan" and r.resolve("MADHUSUDHAN").inferred
    assert r.resolve("JOHN .A.R.").member_id is None and "ambiguous" in r.resolve("JOHN .A.R.").how
    assert r.resolve("Mackesy").member_id is None


def test_book_matching_never_turns_empire_into_empire_of_ai():
    m = BookMatcher([("1", "Empire of AI", "Karen Hao"), ("2", "Bhima: Lone Warrior", "M.T. Vasudevan Nair"),
                     ("3", "The Psychology of Money: Timeless Lessons", "Morgan Housel"), ("4", "Heartstopper: Volume 1", ""),
                     ("5", "Kim Jiyoung, Born 1982", "")])
    assert m.match("Empire", "Dalrymple") == (None, "NEW")
    assert m.match("Bhima", "MT Vasudevan Nair")[0] == "2"
    assert m.match("Psychology of Money")[0] == "3"                              # leading article does not matter
    assert m.near("Heartstopper: Volume 2") is None                              # a different digit is a different book
    assert m.near("Kim Jiyoung, Born 1892")[0] == "5"                            # swapped digits are a typo


@pytest.fixture
def conn(tmp_path):
    from sqlalchemy import create_engine
    from app.database.models import Base
    path = tmp_path / "t.db"
    Base.metadata.create_all(create_engine(f"sqlite:///{path}"))
    c = sqlite3.connect(path, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute("pragma foreign_keys = on")
    now = "datetime('now')"
    c.execute(f"insert into meetups(id, meetup_number, date, format, created_at, updated_at) values ('m1', 90, '2025-11-30', 'in_person', {now}, {now})")
    for i, n in enumerate(["Sherwin", "Deepak"]):
        c.execute(f"insert into members(id, display_name, normalized_name, created_at, updated_at) values (?,?,?, {now}, {now})", (f"u{i}", n, n.lower()))
    return c


def test_reconcile_adds_what_is_missing_and_a_second_run_changes_nothing(conn, tmp_path):
    ps = parse(tmp_path, """
        BBB NOV 2025 - BOOKS DISCUSSED LIST
        @The Bookworm | 30th Nov 2025
        SHERWIN D’SA
          ● The Kite Runner, by Khaled Hosseini
        DEEPAK VARADARAJ
          ● No One Writes The Colonel, by Gabriel Garcia Marquez
        MENTIONS
          ● Books on Tata, by RM Lala
    """)
    members = {r["display_name"]: r["id"] for r in conn.execute("select id, display_name from members")}
    first = reconcile(conn, ps, 90, MemberResolver(members), BookMatcher([]))
    kinds = [o.kind for o in first]
    assert kinds.count("add_mention") == 3 and kinds.count("new_book") == 3 and kinds.count("attendance") == 2
    assert conn.execute("select count(*) from discussions").fetchone()[0] == 3
    assert conn.execute("select member_code from members where display_name = 'Sherwin'").fetchone()[0] == "090-01"
    books = [(r[0], r[1], "") for r in conn.execute("select id, title from canonical_books")]
    again = reconcile(conn, ps, 90, MemberResolver(members), BookMatcher(books))
    assert [o for o in again if o.kind in ("add_mention", "new_book", "attendance", "attach_reader", "move_mention")] == []
    assert invariants(conn) == []


def test_an_unresolved_heading_is_reported_and_nothing_is_written_for_it(conn, tmp_path):
    ps = parse(tmp_path, """
        BBB NOV 2025
        @The Bookworm | 30th Nov 2025
        STRANGER
          ● Some Book, by Someone Else
    """)
    ops = reconcile(conn, ps, 90, MemberResolver({"Sherwin": "u0"}), BookMatcher([]))
    assert [o.kind for o in ops] == ["unresolved"]
    assert conn.execute("select count(*) from discussions").fetchone()[0] == 0


def test_roman_member_table_is_cut_at_each_pages_own_header_offsets(tmp_path):
    ps = parse(tmp_path, """
        Broke Bibliophiles Bangalore, Meetup #96
        Summary (via ChatGPT)
        The May 2026 edition brought together 18 participants who discussed 43 books across many genres of writing.
        List of Books Discussed (noted by Vinay Leo / Padmini)
                Member                 Book Title                                Author(s)
        I       Anindita          1    HBR’s 10 Must Reads for New Managers      Harvard Business Review
                                  2    Apples Never Fall                         Liane Moriarty
        II      Dhilipan          3    Sacred Games                              Vikram Chandra
               Member             Book Title                               Author(s)
                         4   ISRO: A Personal History                      R Aravamudan
        III     Sagar    5    The Mill House Murders              Yukito Ayatsuji
                         GENERAL DISCUSSION BOOKS
               1    One Minute Manager                  Kenneth Blanchard
               2    Surely You’re Joking, Mr Feynman!   Richard Feynman
                                                           Ralph Leighton
    """)
    assert ps.layout == "roman_table"
    by = [(i.heading, i.title, i.author) for i in ps.items]
    assert ("Anindita", "Apples Never Fall", "Liane Moriarty") in by
    assert ("Dhilipan", "ISRO: A Personal History", "R Aravamudan") in by          # a member's row on the next page keeps their name
    assert (None, "One Minute Manager", "Kenneth Blanchard") in by                    # member-less group
    assert (None, "Surely You’re Joking, Mr Feynman!", "Richard Feynman Ralph Leighton") in by


def test_author_interaction_has_author_books_general_lists_and_member_names(tmp_path):
    ps = parse(tmp_path, """
        BROKE
        BIBLIOPHILES
        Meetup #99
        23rd August 2026
        with Sowmiya Ashok
        author of "The Dig"
        AUTHOR INTERACTION
        SOWMIYA'S BOOKS
        RECENT
         Tiger Lessons (Reddy)
        GENERAL DISCUSSION
        The Midnight Train (Haig)
        Percy Jackson (series, Riordan)
        GOKUL
        The Only One Left (Sager)
        THE BROKE BIBLIOPHILES
        THANK YOU
    """)
    got = {(i.section, i.heading, i.title) for i in ps.items}
    assert ("author_discussion", "Sowmiya Ashok", "Tiger Lessons") in got
    assert ("general", None, "The Midnight Train") in got
    assert ("member", "GOKUL", "The Only One Left") in got
    assert "series" in next(i for i in ps.items if i.title == "Percy Jackson").flags
    assert "THANK YOU" not in {i.heading for i in ps.items}


def test_name_colon_list_with_sub_bullets_and_a_dash_without_a_space(tmp_path):
    ps = parse(tmp_path, """
        BYOB +BBB Crossover Meet – 25th Nov, 2023
        Format used: NAME: Book Name - Author
        •   CHITEISRI: Phantom Plague: How Tuberculosis Shaped History - Vidya Krishnan
        •   PALGUN:
               o Teen couples have fun Outdoors - Aravind Jayan
               o Where Stories Gather - Karuna Ezara Parikh
        •   ABHINAND: The Master and Margarita- Mikhail Bulgakov
        •   PUNEETH: How Larry Gogosseum reshaped the Art World [New Yorker magazine]
        •   SANDHYA: Looking for Jane - Heather Marshall
        •   SMRITI: Peril at End House - Agatha Christie
    """)
    assert ps.layout == "name_colon"
    by = {(i.heading, i.title, i.author) for i in ps.items}
    assert ("PALGUN", "Where Stories Gather", "Karuna Ezara Parikh") in by
    assert ("ABHINAND", "The Master and Margarita", "Mikhail Bulgakov") in by
    puneeth = next(i for i in ps.items if i.heading == "PUNEETH")
    assert puneeth.media_hint == "article" and puneeth.author is None


def test_a_heading_followed_by_a_note_in_brackets_is_still_a_heading(tmp_path):
    ps = parse(tmp_path, """
        BBB Meetup 73
        Date: 2024-06-23
        Anindita
            The Fury (Alex Michaelides)
        Harsha (wants historical fiction recommendations)
            Tejo Tungabhadra (Venkatesh Ramakrishnan)
            Books by Ken Follett
    """)
    assert titles(ps, "Harsha") == ["Tejo Tungabhadra", "Books by Ken Follett"]
    assert titles(ps, "Anindita") == ["The Fury"]


def test_translator_inside_the_authors_bracket_is_lifted_out():
    p = split_title_author("Meditations (Aurelius, tr. by Hays)")
    assert (p["title"], p["author"], p["translator"]) == ("Meditations", "Aurelius", "Hays")


def test_ampersand_and_small_digits_match_their_words():
    m = BookMatcher([("1", "A Brief History of Seven Killings", "Marlon James"), ("2", "Jonathan Strange & Mr Norrell", "Susanna Clarke")])
    assert m.match("A Brief History of 7 Killings")[0] == "1"
    assert m.match("Jonathan Strange and Mr Norrell")[0] == "2"
    assert m.near("Jonathan Strange and Mr Norris")[0] == "2"


def test_only_the_approved_held_move_is_applied(conn, tmp_path):
    now = "datetime('now')"
    for i, n in enumerate(["Amel", "Asif"], start=10):
        conn.execute(f"insert into members(id, display_name, normalized_name, created_at, updated_at) values (?,?,?, {now}, {now})", (f"u{i}", n, n.lower()))
    conn.execute(f"insert into canonical_books(id, title, normalized_title, language, media_type, created_at, updated_at) values ('b1','The Gormenghast Trilogy','the gormenghast trilogy','en','book',{now},{now})")
    conn.execute(f"insert into discussions(id, meetup_id, canonical_book_id, member_id, confidence_score, media_type, created_at, updated_at) values ('d1','m1','b1','u11',0.9,'book',{now},{now})")
    ps = parse(tmp_path, """
        BBB SEP 24
        @The Bookworm, 29-09-2024
        Asif
           1. Upheaval (Jared Diamond)
        Amel
           1. The Gormenghast Trilogy (Mervyn Peake)
    """)
    members = {r["display_name"]: r["id"] for r in conn.execute("select id, display_name from members")}
    books = [(r[0], r[1], "") for r in conn.execute("select id, title from canonical_books")]
    held = reconcile(conn, ps, 90, MemberResolver(members), BookMatcher(books))
    assert any(o.kind == "held_move" for o in held) and conn.execute("select member_id from discussions where id='d1'").fetchone()[0] == "u11"
    from app.parsers.changeset import n3
    reconcile(conn, ps, 90, MemberResolver(members), BookMatcher(books), allow_moves={(90, n3("The Gormenghast Trilogy"))})
    assert conn.execute("select member_id from discussions where id='d1'").fetchone()[0] == "u10"


def test_the_importer_reads_member_aliases_from_the_aliases_table(conn):
    from app.parsers.changeset import load_world
    now = "datetime('now')"
    conn.execute(f"insert into aliases(id, entity_type, entity_id, alias_name, created_at, updated_at) values ('a1','member','u0','JOHN .A.R.',{now},{now})")
    members, books, aliases = load_world(conn)
    r = MemberResolver(members, aliases=aliases)
    assert r.resolve("JOHN .A.R.").member_id == "u0" and r.resolve("JOHN .A.R.").how == "explicit alias"
