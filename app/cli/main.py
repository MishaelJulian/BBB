from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from sqlalchemy import func

from app import __version__
from app.core.config import settings
from app.core.logging import logger
from app.core.database import init_db, reset_db, engine, get_db_session
from app.database import models

app = typer.Typer(
    name="archive",
    help="Book Club Archivist - Digital Archival Pipeline CLI",
    add_completion=False,
)
console = Console()


@app.callback(invoke_without_command=True)
def main(
    version: bool = typer.Option(False, "--version", "-v", help="Show version and exit."),
):
    """Book Club Archivist CLI Tool."""
    if version:
        console.print(f"[bold green]Book Club Archivist[/bold green] v{__version__}")
        raise typer.Exit()


@app.command("init-db")
def cmd_init_db():
    """Initialize database tables and schema."""
    console.print(f"[bold blue]Initializing database at:[bold blue] [yellow]{settings.DATABASE_URL}[/yellow]")
    try:
        init_db()
        console.print("[bold green][OK] Database initialized successfully.[/bold green]")
    except Exception as e:
        console.print(f"[bold red][FAIL] Failed to initialize database: {e}[/bold red]")
        raise typer.Exit(code=1)


@app.command("reset-db")
def cmd_reset_db():
    """Drop all tables and recreate from current models."""
    console.print(f"[bold yellow]Resetting database at:[bold yellow] [yellow]{settings.DATABASE_URL}[/yellow]")
    try:
        reset_db()
        console.print("[bold green][OK] Database reset successfully.[/bold green]")
    except Exception as e:
        console.print(f"[bold red][FAIL] Failed to reset database: {e}[/bold red]")
        raise typer.Exit(code=1)


@app.command("check-config")
def cmd_check_config():
    """Validate current configuration settings and DB connectivity."""
    console.print(Panel.fit("[bold cyan]Book Club Archivist System Configuration[/bold cyan]"))
    console.print(f"App Name: [bold]{settings.APP_NAME}[/bold]")
    console.print(f"Environment: [bold]{settings.ENV}[/bold]")
    console.print(f"Base Directory: [bold]{settings.BASE_DIR}[/bold]")
    console.print(f"Data Directory: [bold]{settings.DATA_DIR}[/bold]")
    console.print(f"Logs Directory: [bold]{settings.LOGS_DIR}[/bold]")
    console.print(f"Database URL: [bold]{settings.DATABASE_URL}[/bold]")

    try:
        with engine.connect() as conn:
            console.print("[bold green][OK] Database connectivity: OK[/bold green]")
    except Exception as e:
        console.print(f"[bold red][FAIL] Database connection failed: {e}[/bold red]")


@app.command("stats")
def cmd_stats():
    """Display record counts for all core archival tables."""
    table = Table(title="Book Club Archivist - Database Summary Stats")
    table.add_column("Table", style="cyan", no_wrap=True)
    table.add_column("Record Count", style="magenta", justify="right")

    try:
        with get_db_session() as session:
            model_list = [
                ("Sources", models.Source),
                ("CanonicalBooks", models.CanonicalBook),
                ("ImportedBooks", models.ImportedBook),
                ("PossibleDuplicates", models.PossibleDuplicate),
                ("Authors", models.Author),
                ("Members", models.Member),
                ("Venues", models.Venue),
                ("Meetups", models.Meetup),
                ("Discussions", models.Discussion),
                ("Quotes", models.Quote),
                ("Resources", models.Resource),
                ("Recommendations", models.Recommendation),
                ("CurrentReads", models.CurrentRead),
                ("Publishers", models.Publisher),
                ("Series", models.Series),
                ("Genres", models.Genre),
                ("Tags", models.Tag),
                ("ImportJobs", models.ImportJob),
                ("ValidationErrors", models.ValidationError),
            ]
            for name, model in model_list:
                try:
                    count = session.query(func.count(model.id)).scalar()
                    table.add_row(name, str(count))
                except Exception as e:
                    table.add_row(name, f"Error: {e}")

        console.print(table)
    except Exception as e:
        console.print(f"[bold red]Error fetching database stats: {e}[/bold red]")
        console.print("[yellow]Tip: Run 'archive init-db' first.[/yellow]")


@app.command("import-full")
def cmd_import_full(
    data_dir: str = typer.Option(".", "--data-dir", help="Directory containing archive files"),
    reset: bool = typer.Option(False, "--reset", help="Drop and recreate all tables before import"),
    report_dir: str = typer.Option(".", "--report-dir", help="Directory for output reports"),
):
    """Full archive import: parse all TXT + PDF sources into canonical database."""
    from app.pipeline.full_import import FullArchivePipeline
    from app.reports.generator import ReportGenerator

    data_path = Path(data_dir).resolve()
    report_path = Path(report_dir).resolve()

    if not data_path.exists():
        console.print(f"[bold red][FAIL] Data directory not found: {data_path}[/bold red]")
        raise typer.Exit(code=1)

    console.print(Panel.fit("[bold cyan]BBB Full Archive Import Pipeline[/bold cyan]"))
    console.print(f"Data Directory: [bold]{data_path}[/bold]")
    console.print(f"Report Directory: [bold]{report_path}[/bold]")

    # Reset DB if requested
    if reset:
        console.print("[bold yellow]Resetting database...[/bold yellow]")
        reset_db()

    # Ensure tables exist
    init_db()

    # Run pipeline
    try:
        with get_db_session() as session:
            pipeline = FullArchivePipeline(data_path, session)
            stats = pipeline.run()

            console.print()
            console.print("[bold green]Pipeline Complete![/bold green]")
            console.print(f"  Sources created: {stats.sources_created}")
            console.print(f"  Imported books: {stats.imported_books_created}")
            console.print(f"  Canonical books: {stats.canonical_books_created}")
            console.print(f"  Duplicates detected: {stats.duplicates_detected}")
            console.print(f"  Meetups created: {stats.meetups_created}")
            console.print(f"  Discussions created: {stats.discussions_created}")
            console.print(f"  Members created: {stats.members_created}")
            console.print(f"  Venues created: {stats.venues_created}")
            console.print(f"  Authors created: {stats.authors_created}")
            console.print(f"  Resources created: {stats.resources_created}")

            if stats.warnings:
                console.print(f"\n[bold yellow]Warnings ({len(stats.warnings)}):[/bold yellow]")
                for w in stats.warnings[:10]:
                    console.print(f"  - {w}")

            # Generate reports
            console.print("\n[bold blue]Generating reports...[/bold blue]")
            generator = ReportGenerator()
            generator.generate_all(session, report_path)
            console.print(f"[bold green][OK] Reports generated at {report_path}[/bold green]")

    except Exception as e:
        console.print(f"[bold red][FAIL] Pipeline failed: {e}[/bold red]")
        logger.exception("Pipeline failed")
        raise typer.Exit(code=1)


@app.command("reports")
def cmd_reports(
    report_dir: str = typer.Option(".", "--report-dir", help="Directory for output reports"),
):
    """Generate reports from existing database."""
    from app.reports.generator import ReportGenerator

    report_path = Path(report_dir).resolve()

    try:
        with get_db_session() as session:
            generator = ReportGenerator()
            generator.generate_all(session, report_path)
            console.print(f"[bold green][OK] Reports generated at {report_path}[/bold green]")
    except Exception as e:
        console.print(f"[bold red][FAIL] Report generation failed: {e}[/bold red]")
        raise typer.Exit(code=1)


@app.command("validate")
def cmd_validate():
    """Validate database integrity."""
    console.print("[yellow]Full validation engine coming in future phase.[/yellow]")

    try:
        with get_db_session() as session:
            # Basic integrity checks
            orphaned_books = (
                session.query(models.ImportedBook)
                .filter(models.ImportedBook.canonical_book_id.is_(None))
                .count()
            )
            console.print(f"  Unlinked imported books: {orphaned_books}")

            pending_dups = (
                session.query(models.PossibleDuplicate)
                .filter(models.PossibleDuplicate.status == "PENDING_REVIEW")
                .count()
            )
            console.print(f"  Pending duplicate review: {pending_dups}")

    except Exception as e:
        console.print(f"[bold red]Validation error: {e}[/bold red]")


if __name__ == "__main__":
    app()
