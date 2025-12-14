package http

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"log/slog"
	"slices"
	"sort"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/makinori/foxlib/foxcss"
	"github.com/makinori/foxlib/foxhtml"
	"github.com/mergestat/timediff"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

var (
	//go:embed font.scss
	fontSCSS string
	//go:embed page.scss
	pageSCSS string
	//go:embed page.js
	pageJS string
)

const (
	// https://m2.material.io/design/color/the-color-system.html#tools-for-picking-colors
	ColorRed   = "#f44336" // red 500
	ColorGreen = "#8bc34a" // light green 500
	ColorLime  = "#cddc39" // lime 500
)

func formatUint(n uint64) string {
	str := strconv.FormatUint(n, 10)
	len := len(str)

	var out []byte
	for i := range len {
		out = append(out, str[len-1-i])
		if i < len-1 && i%3 == 2 {
			out = append(out, ',')
		}
	}
	slices.Reverse(out)

	return string(out)
}

func formatName(userInfo *user.UserInfo) string {
	if userInfo.DisplayName == "" {
		return userInfo.Username
	} else {
		return fmt.Sprintf("%s (%s)", userInfo.DisplayName, userInfo.Username)
	}
}

func getImageURL(imageID uuid.UUID) string {
	// https://wiki.secondlife.com/wiki/Picture_Service
	return fmt.Sprintf(
		"https://picture-service.secondlife.com/%s/60x45.jpg",
		imageID.String(),
	)
}

func renderUser(ctx context.Context, user *user.UserWithID, online bool) Node {
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
		statusText = strings.ReplaceAll(statusText, "ago", "")
		statusText = strings.TrimSpace(statusText)
	}

	return Tr(
		ID(user.ID.String()),
		Class(foxcss.Class(ctx, `
			font-size: 20px;
			letter-spacing: -1px;

			.avatar-icon {
				width: 32px;
				height: 32px;
				border-radius: 8px;
				cursor: pointer;
				transition: all 100ms ease;
				&:hover {
					transform: scale(1.1);
				}
				&:active {
					transform: scale(0.9);
					&.in-left {
						transform: rotate(-5deg);
					}
					&.in-right {
						transform: rotate(5deg);
					}
				}
			}

			.name {
				font-weight: 800;
				opacity: 0.9;

				> span {
					font-weight: 700;
					font-size: 16px;
					opacity: 0.4;
					margin-left: 8px;
				}
			}

			.time {
				font-weight: 700;
				opacity: 0.6;
				text-align: right;
				padding-right: 16px;
			}

			.status {
				> div {
					align-items: center;
					gap: 6px;
				}
				.strip {
					width: 6px;
					height: 24px;
					border-radius: 4px;
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
			}
		`)),
		Td(Img(
			Class("avatar-icon"),
			Src(getImageURL(user.User.Info.ImageID)),
			Loading("lazy"),
		)),
		Td(
			Class("name"),
			nameEl,
		),
		Td(
			Class("time"),
			// Text(formatUint(user.User.Minutes)+" minutes"),
			Text(formatUint(user.User.Minutes/60)+" hours"),
		),
		Td(
			Class("status "+statusClass),
			foxhtml.HStack(ctx,
				Div(Class("strip")),
				A(
					Text(statusText),
					Title(statusDate),
					Href(userURL),
				),
			),
		),
	)
}

func renderUsers(
	ctx context.Context, sortedUsers []user.UserWithID, onlineUUIDs []uuid.UUID,
) (Node, uint64, uint64) {
	var total, totalMinutes uint64

	tableRows := make(Group, len(sortedUsers))
	for i := range sortedUsers {
		online := slices.Contains(onlineUUIDs, sortedUsers[i].ID)

		tableRows[i] = renderUser(ctx, &sortedUsers[i], online)

		total++
		totalMinutes += sortedUsers[i].User.Minutes
	}

	return Table(
		Class(foxcss.Class(ctx, `
			width: 100%;
		`)),
		tableRows,
	), total, totalMinutes / 60
}

func renderMapUser(
	ctx context.Context, region string, onlineUser *lsl.OnlineUser,
	users []user.UserWithID,
) Node {
	var user *user.UserWithID
	for i := range users {
		if users[i].ID == onlineUser.UUID {
			user = &users[i]
			break
		}
	}
	if user == nil {
		return nil
	}

	x := onlineUser.X
	regionIndex := slices.Index(env.REGIONS, region)
	if regionIndex > -1 {
		x += regionIndex * 256
	}

	// TODO: a with #

	return A(
		Href("#"+user.ID.String()),
		Class(foxcss.Class(ctx, `
			position: absolute;
			width: 32px;
			height: 32px;
			border-radius: 999px;
			overflow: hidden;
			transform: translate(-50%, -50%);
			display: flex;
			align-items: center;
			justify-content: center;

			> img {
				width: 24px;
				height: 24px;
				border-radius: 999px;
				transition: all 150ms ease;
			}

			&:hover {
				> img {
					width: 32px;
					height: 32px;
				}
			}
		`)),
		Style(fmt.Sprintf(
			"left:%.2f%%;top:%.2f%%",
			float32(clamp(x, 0, 512))/512*100,
			float32(256-clamp(onlineUser.Y, 0, 256))/256*100,
		)),
		Title(formatName(&user.Info)),
		Img(Src(getImageURL(user.Info.ImageID))),
	)
}

func renderMap(
	ctx context.Context, onlineUsersMap map[string][]lsl.OnlineUser,
	users []user.UserWithID,
) Node {
	var userEls Group

	for region, onlineUsers := range onlineUsersMap {
		for i := range onlineUsers {
			userEls = append(userEls,
				renderMapUser(ctx, region, &onlineUsers[i], users),
			)
		}
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
			width: calc(100% - 128px);
			background-size: 100% 100%;
			border-radius: 8px;
			position: relative;
		`)),
		userEls,
		Div(Class(foxcss.Class(ctx, `
			position: absolute;
			top: 6px;
			left: 6px;
			border-radius: 999px;
			width: 8px;
			height: 8px;
			background: `+firstSimOnlineColor+`;
		`))),
		Div(Class(foxcss.Class(ctx, `
			position: absolute;
			top: 6px;
			right: 6px;
			border-radius: 999px;
			width: 8px;
			height: 8px;
			background: `+secondSimOnlineColor+`;
		`))),
	)
}

func content(ctx context.Context) (Group, error) {
	// get users and sort
	// TODO: this could get expensive so maybe we should cache this
	// TODO: these data structures being passed around like this is also ineffecient

	unsortedUsers, err := user.GetUsers()
	if err != nil {
		slog.Error("failed to get online users", "err", err)
		return Group{}, errors.New("failed to get online users")
	}

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

	onlineUsers := lsl.GetData()
	onlineUUIDs := lsl.GetOnlineUUIDs(onlineUsers)

	users, total, totalHours := renderUsers(ctx, sortedUsers, onlineUUIDs)

	sinceText := ""
	switch env.AREA {
	case "baltimare":
		sinceText = "august 6th 2024"
	case "cloudsdale":
		sinceText = "january 13th 2025"
	}

	var logoEl Node

	switch env.AREA {
	case "baltimare":
		logoEl = Img(
			Class(foxcss.Class(ctx, `
					width: 600px;
					max-width: 100%;
					align-self: center;
					margin-top: 48px;
					margin-bottom: 48px;
				`)),
			Src("/logos/baltimare-opg.png"),
		)
	case "cloudsdale":
		logoEl = H1(
			Class(foxcss.Class(ctx, `
				text-align: center;
				margin-top: 64px;
				margin-bottom: 64px;
				font-size: 64px
			`)),
			Text("cloudsdale"),
		)
	}

	return Group{
		foxhtml.HStack(ctx,
			foxhtml.StackSCSS(`
				align-items: center;
				justify-content: center;
			`),
			logoEl,
		),
		foxhtml.HStack(ctx,
			foxhtml.StackSCSS(`
				flex-direction: row;
			`),
			P(
				Text("promise the page will look just as pretty again soon"),
			),
			Div(Style("flex-grow:1")),
			A(
				Img(Height("24"), Src("/icons/github.svg")),
				Href("https://github.com/makinori/baltimare-leaderboard"),
			),
			A(
				Img(Height("24"), Src("/icons/tor.svg")),
				Href("http://"+env.AREA+".hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"),
			),
		),
		Br(),
		P(
			Class(foxcss.Class(ctx, `
				font-weight: 700;
				color: rgba(`+ColorGreen+`, 0.6);
				span {
					color: `+ColorGreen+`;
				} 
			`)),
			Text("> "),
			Span(Text(formatUint(uint64(len(onlineUUIDs)))+" online")),
			Text(" right now"),
			Br(),
			Text("> "),
			Span(Text(formatUint(total)+" popens")),
			Text(" seen in total"),
			Br(),
			Text("> "),
			Span(Text(formatUint(totalHours)+" hours")),
			Text(" collectively"),
		),
		Br(),
		P(
			Class(foxcss.Class(ctx, `
				font-weight: 700;
				color: rgba(`+ColorLime+`, 0.6);
				span {
					color: `+ColorLime+`;
				} 
			`)),
			Text("> total time online since "),
			Span(Text(sinceText)),
			Br(),
			Text("> also how long ago since last online"),
		),
		Br(),
		renderMap(ctx, onlineUsers, sortedUsers),
		Br(),
		users,
	}, nil
}

func renderPage() (string, bool) {
	ctx := context.Background()
	ctx = foxcss.InitContext(ctx)

	contentGroup, err := content(ctx)
	if err != nil {
		return err.Error(), false
	}

	var contentDiv = Div(
		Class(foxcss.Class(ctx, `
			display: flex;
			justify-content: center;
			width: 100vw;
		`)),
		Div(
			Class(foxcss.Class(ctx, `
				width: 800px;
				max-width: 800px;
				margin-bottom: 128px;
			`)),
			contentGroup,
		),
	)

	css, err := foxcss.RenderSCSS(
		pageSCSS+"\n"+foxcss.GetPageSCSS(ctx),
		foxcss.SassImport{Filename: "font.scss", Content: fontSCSS},
	)
	if err != nil {
		slog.Error("failed to render scss", "err", err)
		return "failed to render scss", false
	}

	return Group{HTML(
		Head(
			TitleEl(Text(env.AREA+" leaderboard")),
			StyleEl(Raw(css)),
		),
		Body(
			contentDiv,
			Script(Raw(pageJS)),
		),
	)}.String(), true
}
