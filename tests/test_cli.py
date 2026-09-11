from typer.testing import CliRunner
from app.cli.main import app

runner = CliRunner()


def test_cli_version():
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert "Book Club Archivist" in result.stdout


def test_cli_check_config():
    result = runner.invoke(app, ["check-config"])
    assert result.exit_code == 0
    assert "System Configuration" in result.stdout


def test_cli_stats():
    result = runner.invoke(app, ["stats"])
    assert result.exit_code == 0
    assert "Summary Stats" in result.stdout
    assert "Record Count" in result.stdout
