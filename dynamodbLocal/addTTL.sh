aws dynamodb update-time-to-live --table-name Game --endpoint http://localhost:8042 --region localhost --time-to-live-specification "Enabled=true, AttributeName=ttl"