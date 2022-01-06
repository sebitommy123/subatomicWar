docker pull ghcr.io/sebitommy123/commonwealth:latest

docker run -d \
  --name watchtower \
  -e REPO_USER=sebitommy123 \
  -e REPO_PASS=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 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower ghcr.io/sebitommy123/commonwealth:latest --debug
