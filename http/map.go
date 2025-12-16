package http

import (
	"context"
	_ "embed"
	"encoding/binary"
	"fmt"
	"log/slog"
	"slices"
	"strconv"
	"sync"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/makinori/foxlib/foxcss"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

type mapUser struct {
	ID      uuid.UUID
	ImageID uuid.UUID
	Name    string
	X, Y    float64
}

func renderMapUser(
	ctx context.Context, mapUser *mapUser,
) Node {
	return A(
		ID("map-"+mapUser.ID.String()),
		Href("#"+mapUser.ID.String()),
		Class(foxcss.Class(ctx, `
			position: absolute;
			width: 32px;
			height: 32px;
			border-radius: 999px;
			overflow: hidden;
			// positive y cause we're using left,bottom
			transform: translate(-50%, 50%);
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 100ms ease;

			> img {
				width: 24px;
				height: 24px;
				border-radius: 999px;
				transition: all 150ms ease;
			}

			&:hover {
				z-index: 100;
				> img {
					width: 32px;
					height: 32px;
				}
			}
		`)),
		Style(fmt.Sprintf(
			"left:%.2f%%;bottom:%.2f%%",
			float64(clamp(mapUser.X, 0, 512))/512*100,
			float64(clamp(mapUser.Y, 0, 256))/256*100,
		)),
		Title(mapUser.Name),
		Img(Src(getImageURL(mapUser.ImageID))),
	)
}

type Seed [4]uint32

func randWithSeed(seed uint32) uint32 {
	// Robert Jenkins' 32 bit integer hash function.
	seed = seed & 0xffffffff
	seed = (seed + 0x7ed55d16 + (seed << 12)) & 0xffffffff
	seed = (seed ^ 0xc761c23c ^ (seed >> 19)) & 0xffffffff
	seed = (seed + 0x165667b1 + (seed << 5)) & 0xffffffff
	seed = ((seed + 0xd3a2646c) ^ (seed << 9)) & 0xffffffff
	seed = (seed + 0xfd7046c5 + (seed << 3)) & 0xffffffff
	seed = (seed ^ 0xb55a4f09 ^ (seed >> 16)) & 0xffffffff
	return (seed & 0xfffffff) / 0x10000000
}

func normalizeWithSeed(x, y *float64, seed Seed) {
	d := distance(*x, *y)
	if d == 0 {
		*x = float64(randWithSeed(seed[0]))*2 - 1
		*y = float64(randWithSeed(seed[1]))*2 - 1
		d = distance(*x, *y)
	}
	*x /= d
	*y /= d
}

func uuidAsRandSeed(uuid uuid.UUID) Seed {
	return Seed{
		binary.LittleEndian.Uint32(uuid[0:4]),
		binary.LittleEndian.Uint32(uuid[4:8]),
		binary.LittleEndian.Uint32(uuid[8:12]),
		binary.LittleEndian.Uint32(uuid[12:16]),
	}
}

func spreadMapUsers(mapUsers []*mapUser) {
	const circleDiameter = 16
	const movePerIteration = 2

	findOverlaps := func(needle *mapUser) []*mapUser {
		var overlaps []*mapUser

		for _, mapUser := range mapUsers {
			if mapUser == needle {
				continue
			}

			d := distance(
				float64(mapUser.X)-float64(needle.X),
				float64(mapUser.Y)-float64(needle.Y),
			)

			if d < circleDiameter {
				overlaps = append(overlaps, mapUser)
			}
		}

		return overlaps
	}

	type mapUserWithOverlaps struct {
		*mapUser
		overlaps []*mapUser
	}

	iterate := func() bool {
		anyOverlaps := false

		wg := sync.WaitGroup{}
		mapUsersWithOverlaps := make([]*mapUserWithOverlaps, len(mapUsers))
		for i, mapUser := range mapUsers {
			wg.Go(func() {
				mapUsersWithOverlaps[i] = &mapUserWithOverlaps{
					mapUser:  mapUser,
					overlaps: findOverlaps(mapUser),
				}
			})
		}
		wg.Wait()

		// sort by least overlaps first
		// is this necessary? we could remove mapUserWithOverlaps entirely
		// maybe this helps keep the map more stable
		slices.SortFunc(mapUsersWithOverlaps,
			func(a, b *mapUserWithOverlaps) int {
				// TODO: might be flipped
				return len(a.overlaps) - len(b.overlaps)
			},
		)

		for _, mapUserWithOverlaps := range mapUsersWithOverlaps {
			mapUser := mapUserWithOverlaps.mapUser

			// need to get fresh already cause we're moving users around
			// overlaps := mapUserWithOverlaps.overlaps
			overlaps := findOverlaps(mapUser)
			if len(overlaps) == 0 {
				continue
			}

			anyOverlaps = true

			// fix position

			var relDirX float64
			var relDirY float64

			seed := uuidAsRandSeed(mapUser.ID)

			for _, overlap := range overlaps {
				currentDirX := float64(mapUser.X - overlap.X)
				currentDirY := float64(mapUser.Y - overlap.Y)

				normalizeWithSeed(&currentDirX, &currentDirY, seed)

				relDirX += currentDirX
				relDirY += currentDirY
			}

			normalizeWithSeed(&relDirX, &relDirY, seed)

			mapUser.X += relDirX * movePerIteration
			mapUser.Y += relDirY * movePerIteration
		}

		return anyOverlaps
	}

	const maxIterationCount = (circleDiameter / movePerIteration) * 8

	for range maxIterationCount {
		if !iterate() {
			break
		}
	}
}

func getUserByID(uuid uuid.UUID, users []user.UserWithID) *user.UserWithID {
	for i := range users {
		if uuid == users[i].ID {
			return &users[i]
		}
	}
	return nil
}

const mapWidth = "calc(100% - 96px)"

func renderMap(
	ctx context.Context, onlineUsersMap map[string][]lsl.OnlineUser,
	users []user.UserWithID,
) Node {
	var mapUsers []*mapUser

	for region, onlineUsers := range onlineUsersMap {
		for i := range onlineUsers {
			user := getUserByID(onlineUsers[i].UUID, users)
			if user == nil {
				continue
			}

			mapUser := mapUser{
				ID:      user.ID,
				ImageID: user.Info.ImageID,
				Name:    formatName(&user.Info),
				X:       float64(onlineUsers[i].X),
				Y:       float64(onlineUsers[i].Y),
			}

			regionIndex := slices.Index(env.REGIONS, region)
			if regionIndex > -1 {
				mapUser.X += float64(regionIndex * 256)
			}

			mapUsers = append(mapUsers, &mapUser)
		}
	}

	spreadMapUsers(mapUsers)

	userEls := make(Group, len(mapUsers))
	for i := range mapUsers {
		userEls[i] = renderMapUser(ctx, mapUsers[i])
	}

	var mapImageURL string
	switch env.AREA {
	case "baltimare":
		mapImageURL = "/maps/baltimare.webp"
	case "cloudsdale":
		mapImageURL = "/maps/cloudsdale.jpg"
	}

	_, health := lsl.GetHealth()

	firstSimOnlineColor := ColorRed
	if health[env.REGIONS[0]] {
		firstSimOnlineColor = ColorGreen
	}

	secondSimOnlineColor := ColorRed
	if health[env.REGIONS[1]] {
		secondSimOnlineColor = ColorGreen
	}

	return Div(
		Class(foxcss.Class(ctx, `
			background-image: 
				linear-gradient(0deg, rgba(#111, 0.5), rgba(#111, 0.5)), 
				url("`+mapImageURL+`");
			aspect-ratio: 2/1;
			width: `+mapWidth+`;
			background-size: 100% 100%;
			border-radius: 8px;
			position: relative;
		`)),
		Attr("hx-get", "/hx/map"),
		Attr("hx-swap", "morph:outerHTML"),
		Attr("hx-trigger", "every "+strconv.Itoa(lsl.ScriptIntervalSeconds)+"s"),
		userEls,
		Div(
			Class(foxcss.Class(ctx, `
				position: absolute;
				top: 6px;
				left: 6px;
				border-radius: 999px;
				width: 8px;
				height: 8px;
			`)),
			Style(`background:`+firstSimOnlineColor),
		),
		Div(
			Class(foxcss.Class(ctx, `
				position: absolute;
				top: 6px;
				right: 6px;
				border-radius: 999px;
				width: 8px;
				height: 8px;
			`)),
			Style(`background:`+secondSimOnlineColor),
		),
	)
}

func renderOnlyMap() (string, bool) {
	ctx := context.Background()
	ctx = foxcss.InitContext(ctx)

	users, err := user.GetUsers()
	if err != nil {
		slog.Error("failed to only render map", "err", err)
		return "failed to only render map", false
	}

	node := renderMap(ctx, lsl.GetData(), users)

	css, err := foxcss.RenderSCSS(foxcss.GetPageSCSS(ctx))
	if err != nil {
		slog.Error("failed to only render map", "err", err)
		return "failed to only render map", false
	}

	html := Group{
		Head(StyleEl(Raw(css))),
		node,
	}.String()

	return html, true
}
