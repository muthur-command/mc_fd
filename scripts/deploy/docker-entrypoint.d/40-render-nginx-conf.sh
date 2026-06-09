#!/bin/sh
set -e

: "${MC_BACKEND_HOST:=mc_bd}"
: "${MC_BACKEND_PORT:=8001}"
export MC_BACKEND_HOST MC_BACKEND_PORT

envsubst '${MC_BACKEND_HOST} ${MC_BACKEND_PORT}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf
