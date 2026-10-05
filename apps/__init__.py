"""
Zonatic applications.

A container for the app workspaces. Only `api` is a Python package; `console`,
`console-api`, and `web` are Node packages managed by the pnpm workspace and are
never imported from Python.

Making this an explicit package (rather than relying on a PEP 420 namespace
package) keeps `apps.api` importable the same way from the API container, from
pytest, and from a developer checkout.
"""