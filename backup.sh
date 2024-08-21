#!/bin/bash
mkdir -p db/backups
cp db/users.db db/backups/users-$(date +%F).db
