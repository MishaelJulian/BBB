from app.database import models


def test_create_author_and_book(db_session):
    author = models.Author(
        full_name="Fyodor Dostoevsky",
        normalized_name="fyodor dostoevsky",
        country="Russia",
    )
    db_session.add(author)
    db_session.commit()

    book = models.Book(
        title="Crime and Punishment",
        author_id=author.id,
        isbn13="9780140449136",
    )
    db_session.add(book)
    db_session.commit()

    fetched_book = db_session.query(models.Book).filter_by(title="Crime and Punishment").first()
    assert fetched_book is not None
    assert fetched_book.author.full_name == "Fyodor Dostoevsky"


def test_provenance_and_discussion(db_session):
    source = models.Source(
        url="https://example.com/meetup/1",
        importer_name="website",
    )
    db_session.add(source)
    db_session.commit()

    member = models.Member(
        display_name="Alice Smith",
        normalized_name="alice smith",
    )
    db_session.add(member)

    meetup = models.Meetup(
        meetup_number=1,
        title="First Book Club Meeting",
        source_id=source.id,
    )
    db_session.add(meetup)
    db_session.commit()

    discussion = models.Discussion(
        member_id=member.id,
        meetup_id=meetup.id,
        source_id=source.id,
        rating=4.5,
        review="Fantastic discussion!",
    )
    db_session.add(discussion)
    db_session.commit()

    quote = models.Quote(
        discussion_id=discussion.id,
        member_id=member.id,
        quote_text="Man grows used to everything, the scoundrel!",
        source_id=source.id,
    )
    db_session.add(quote)
    db_session.commit()

    assert discussion.source.url == "https://example.com/meetup/1"
    assert len(discussion.quotes) == 1
    assert discussion.quotes[0].quote_text.startswith("Man grows used")


def test_import_job_logging(db_session):
    job = models.ImportJob(source_type="website", status="processing")
    db_session.add(job)
    db_session.commit()

    log_entry = models.ImportLog(
        job_id=job.id,
        log_level="INFO",
        message="Started crawling site",
    )
    db_session.add(log_entry)
    db_session.commit()

    assert len(job.logs) == 1
    assert job.logs[0].message == "Started crawling site"
