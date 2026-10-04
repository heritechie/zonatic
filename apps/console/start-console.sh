#!/bin/sh
# Entry point for the `zonatic-console` Cloud Run service.
#
# The service bundles two processes that together answer every request on a
# single public port:
#
#   caddy        -> public port ($PORT), serves the console SPA and proxies
#                   /graphql to the loopback port below
#   console-api  -> internal port only ($CONSOLE_API_PORT), GraphQL Yoga
#
# Caddy is exec'd last so it becomes PID 1. That matters on Cloud Run: the
# stop signal is delivered to PID 1, and Caddy drains in-flight requests
# during its graceful shutdown.
#
# NOTE: this script does not supervise console-api. If the GraphQL process
# exits, the container stays up and Caddy returns 502 for /graphql. That is
# acceptable for the MVP; Cloud Run instance health checks and a real
# supervisor can replace it later.

set -eu

: "${PORT:=8080}"
: "${CONSOLE_API_PORT:=8000}"
export PORT CONSOLE_API_PORT

PORT="$CONSOLE_API_PORT" node /srv/api/dist/server.js &

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
