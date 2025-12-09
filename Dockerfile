FROM docker.io/golang:1.25.5 AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY ./ ./

RUN \
GOEXPERIMENT=greenteagc \
CGO_ENABLED=0 GOOS=linux \
go build -ldflags="-s -w" -o baltimare-leaderboard && \
strip baltimare-leaderboard

# create final image

FROM scratch

WORKDIR /

# COPY --from=build /etc/ssl/certs/ca-certificates.crt \
# /etc/ssl/certs/ca-certificates.crt

COPY --from=build /app/baltimare-leaderboard /baltimare-leaderboard

ENTRYPOINT ["/baltimare-leaderboard"]
