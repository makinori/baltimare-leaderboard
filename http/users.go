package http

import (
	"context"
	_ "embed"
	"fmt"
	"log/slog"
	"runtime"
	"slices"
	"sort"
	"strconv"
	"strings"

	"git.ran.cafe/maki/foxlib/foxcss"
	"git.ran.cafe/maki/foxlib/foxhtml"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/mergestat/timediff"
	"golang.org/x/sync/semaphore"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

var rainbowBackgroundForNthChildCSS string

func init() {
	for i := range 36 {
		rainbowBackgroundForNthChildCSS += `
			&:nth-child(36n + ` + strconv.Itoa(i+1) + `) .progress-bar {
		  		background: hsl(` + strconv.Itoa(i*10) + `, 20%, 30%)
		  	}
		`
	}
}

func renderUser(
	ctx context.Context, user *user.UserWithID,
	online bool, maxMinutes uint64,
) Node {
	percentage := float32(user.Minutes) / float32(maxMinutes)

	nameEl := Group{}
	if user.Info.DisplayName == "" {
		nameEl = Group{
			Text(user.Info.Username),
		}
	} else {
		nameEl = Group{
			Text(user.Info.DisplayName),
			Span(Text(user.Info.Username)),
		}
	}

	traitEls := Group{}
	userTraits := uuidTraitMap[user.ID]

	for _, userTrait := range userTraits {
		imageTrait, ok := imageTraitMap[userTrait]
		if ok {
			traitEls = append(traitEls, A(
				Class("image-trait"),
				Target("_blank"),
				Href(imageTrait.URL),
				Img(
					Src("/traits/"+userTrait),
					Height(strconv.Itoa(imageTrait.Size)+"px"),
				),
			))
		}
	}

	userURL := "https://world.secondlife.com/resident/" + user.ID.String()

	var statusClass, statusText string
	statusDate := user.LastSeen.Format("Jan 2 2006, 15:04 MST")

	if online {
		statusClass = "online"
		statusText = "online"
	} else {
		statusClass = "offline"
		statusText = timediff.TimeDiff(user.User.LastSeen)
		statusText = strings.ReplaceAll(statusText, "a few", "few")
		statusText = strings.ReplaceAll(statusText, "minute", "min")
		statusText = strings.ReplaceAll(statusText, "second", "sec")
		statusText = strings.ReplaceAll(statusText, "ago", "")
		statusText = strings.TrimSpace(statusText)
	}

	return foxhtml.HStack(ctx,
		ID(user.ID.String()),
		foxhtml.StackCSS(`
			font-size: 20px;
			letter-spacing: -1px;
			width: 100%;
			height: 32px;
			align-items: center;
			gap: 0;

			`+rainbowBackgroundForNthChildCSS+`

			.avatar-icon {
				width: 32px;
				height: 32px;
				border-radius: 8px;
				cursor: pointer;
				transition: all 100ms ease;
				user-select: none;
				z-index: 10;
				background: #333;
			}
			.avatar-icon:hover {
				transform: scale(1.1);
			}
			.avatar-icon.in-left {
				transform: scale(0.9) rotate(-5deg);
			}
			.avatar-icon.in-right {
				transform: scale(0.9) rotate(5deg);
			}

			.image-trait {
				transition: all 100ms ease;
			}
			.image-trait:hover {
				transform: scale(1.1);
			}
		`),
		Img(
			Class("avatar-icon"),
			Src("/api/user/"+user.ID.String()+"/image"),
			Loading("lazy"),
			Draggable("false"),
		),
		Div(
			Class(foxcss.Class(ctx, `
				flex-grow: 1;
				height: 100%;
				position: relative;
				background: #222;

				border-radius: 8px;
				margin-left: -8px;

				.progress-bar {
					position: absolute;
					top: 0;
					bottom: 0;
					left: 0;
					border-radius: 8px;
				}
			`)),
			Div(
				Class("progress-bar"),
				Style(fmt.Sprintf("right: %02f%%", (1-percentage)*100)),
			),
			foxhtml.HStack(ctx,
				foxhtml.StackCSS(`
					position: absolute;
					top: 0;
					bottom: 0;
					left: 16px;
					right: 12px;
					align-items: center;
				`),
				Div(
					Class(foxcss.Class(ctx, `
						font-weight: 800;
						opacity: 0.9;
						text-shadow: 2px 2px 0px rgba(`+foxcss.HexToRGB("#111")+`, 0.4);
						> span {
							font-weight: 700;
							font-size: 16px;
							opacity: 0.4;
							margin-left: 8px;
						}
					`)),
					nameEl,
				),
				traitEls,
				Div(Class(foxcss.Class(ctx, `flex-grow:1`))),
				Div(
					Class(foxcss.Class(ctx, `
						font-weight: 700;
						opacity: 0.6;
						text-align: right;
					`)),
					// Text(formatUint(user.User.Minutes)+" minutes"),
					Text(formatUint(user.User.Minutes/60)+" hours"),
				),
			),
		),
		Div(
			Class(foxcss.Class(ctx, `
				width: 80px;
				height: 100%;
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 6px;
				padding-left: 6px;

				> div {
					align-items: center;
					gap: 6px;
				}
				.strip {
					width: 6px;
					height: 24px;
					border-radius: 4px;
					background: #222;
				}
				&.online .strip {
					background: `+ColorGreen+`;
				}
				&.offline .strip {
					background: `+ColorRed+`;
				}
				a {
					opacity: 0.4;
					font-size: 16px;
					font-weight: 700;
					white-space: nowrap;
				}
			`)+" "+statusClass),
			Div(Class("strip")),
			A(
				Text(statusText),
				Title(statusDate),
				Href(userURL),
			),
		),
	)
}

func getSortedUsers(unsortedUsers []user.UserWithID) ([]user.UserWithID, error) {
	// TODO: this could get expensive so maybe we should cache this
	// TODO: these data structures are also ineffecient

	var sortedUsers []user.UserWithID

	for i := range unsortedUsers {
		if unsortedUsers[i].User.Minutes >= 120 &&
			!slices.Contains(traitUUIDMap["bot"], unsortedUsers[i].ID) {
			sortedUsers = append(sortedUsers, unsortedUsers[i])
		}
	}

	sort.Slice(sortedUsers, func(i, j int) bool {
		return sortedUsers[i].User.Minutes > sortedUsers[j].User.Minutes
	})

	return sortedUsers, nil
}

func renderUsers(
	data *renderData, maxMinutes uint64,
) Node {
	userEls := make(Group, len(data.users))

	workers := int64(runtime.GOMAXPROCS(0))
	sem := semaphore.NewWeighted(workers)

	for i := range data.users {
		err := sem.Acquire(data.ctx, 1)
		if err != nil {
			slog.Error("failed to acquire semaphore", "err", err)
			return nil
		}
		go func() {
			defer sem.Release(1)
			online := slices.Contains(data.onlineUUIDs, data.users[i].ID)
			userEls[i] = renderUser(data.ctx, &data.users[i], online, maxMinutes)
		}()
	}

	err := sem.Acquire(data.ctx, workers)
	if err != nil {
		slog.Error("failed to acquire semaphore", "err", err)
		return nil
	}

	return foxhtml.VStack(data.ctx,
		Attr("hx-get", "/hx/users"),
		Attr("hx-swap", "morph:outerHTML"),
		Attr("hx-trigger", "every 1m"),
		foxhtml.StackCSS(`
			gap: 4px;
		`),
		userEls,
	)
}

func renderOnlyUsers() (string, bool) {
	data, err := getRenderData(true, "u-")
	if err != nil {
		return err.Error(), false
	}

	stats := getStats(data)

	node := renderUsers(data, stats.maxMinutes)

	html := Group{
		Head(StyleEl(Raw(foxcss.GetPageCSS(data.ctx)))),
		node,
	}.String()

	return html, true
}
