systemctl start docker

export CR_PAT=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

git config --global user.name 'sebitommy123'
git config --global user.email 'sebi.szafir@hotmail.com'

echo $CR_PAT | docker login ghcr.io -u sebitommy123 --password-stdin

docker pull ghcr.io/sebitommy123/commonwealth:latest

docker run -p3002:3002 -d ghcr.io/sebitommy123/commonwealth:latest

docker run -d \
  --name watchtower \
  -e REPO_USER=sebitommy123 \
  -e REPO_PASS=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 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower ghcr.io/sebitommy123/commonwealth:latest --debug --interval=10
