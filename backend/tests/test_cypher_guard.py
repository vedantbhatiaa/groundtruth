import pytest
from app.services.cypher_guard import validate, UnsafeCypherError


def test_allows_plain_match():
    result = validate("MATCH (s:Site) RETURN s.name LIMIT 10")
    assert "MATCH" in result


def test_adds_limit_when_missing():
    result = validate("MATCH (s:Site) RETURN s.name")
    assert "LIMIT 200" in result


def test_blocks_create():
    with pytest.raises(UnsafeCypherError):
        validate("CREATE (s:Site {name: 'x'})")


def test_blocks_delete():
    with pytest.raises(UnsafeCypherError):
        validate("MATCH (s:Site) DELETE s")


def test_does_not_false_positive_on_created_at_property():
    # "created_at" should not trip the "create" keyword check
    result = validate("MATCH (f:Filing) RETURN f.created_at LIMIT 5")
    assert "created_at" in result
