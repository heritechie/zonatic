from app.main import LEVEL_KEYS


def test_level_keys_are_complete():
    assert LEVEL_KEYS == {
        1: "province",
        2: "regency_or_city",
        3: "district",
        4: "village_or_ward",
    }

