"""
Pytest bootstrap for the repository root.

The public API package now lives at `apps/api`, so `apps.api.*` imports require
the repository root on `sys.path`.

pytest adds a conftest's own directory to `sys.path` in its default "prepend"
import mode, so this file is enough on its own — no packaging install and no
`PYTHONPATH` export. It matters because `python -m pytest` puts the current
directory on `sys.path` while the `pytest` console script does not, and both
forms are documented for running the suite.
"""