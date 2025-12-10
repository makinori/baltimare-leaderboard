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
	url := "https://world.secondlife.com/resident/" + user.ID.String()

	lastSeenText := user.LastSeen.Format("Jan _2 2006, 15:04 MST")

	var lastSeenRow Node
	if online {
		lastSeenRow = Td(
			Class(foxcss.Class(ctx, `
				color: `+ColorGreen+`;
				font-weight: 600;
			`)),
			Text("online"),
			Title(lastSeenText),
		)
	} else {
		lastSeenRow = Td(
			Class(foxcss.Class(ctx, `
				color: `+ColorRed+`;
				font-weight: 600;
			`)),
			Text(timediff.TimeDiff(user.User.LastSeen)),
			Title(lastSeenText),
		)
	}

	return Tr(
		Class(foxcss.Class(ctx, `
			.icon {
				width: 32px;
				height: 32px;
				border-radius: 8px;
			}

			.name {
				font-weight: 700;
			}
		`)),
		Td(A(
			Href(url),
			Img(
				Class("icon"),
				Src(getImageURL(user.User.Info.ImageID)),
				Loading("lazy"),
			),
		)),
		Td(
			Class("name"),
			Text(formatName(&user.User.Info)),
		),
		// Td(Text(formatUint(user.User.Minutes)+" minutes")),
		Td(Text(formatUint(user.User.Minutes/60)+" hours")),
		lastSeenRow,
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
	x := onlineUser.X
	if region == "baltimare" || region == "cloudsdale" {
		x += 256
	}

	var imageUrl string
	for i := range users {
		if users[i].ID == onlineUser.UUID {
			imageUrl = getImageURL(users[i].Info.ImageID)
			break
		}
	}

	return Img(
		Class(foxcss.Class(ctx, `
			position: absolute;
			width: 32px;
			height: 32px;
			border-radius: 999px;
			transform: translate(-50%, -50%);
		`)),
		Style(fmt.Sprintf(
			"left:%.2f%%;top:%.2f%%",
			float32(clamp(x, 0, 512))/512*100,
			float32(256-clamp(onlineUser.Y, 0, 256))/256*100,
		)),
		Src(imageUrl),
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
				Href("http://baltimare.hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"),
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

	css, err := foxcss.RenderSCSS(pageSCSS + "\n" + foxcss.GetPageSCSS(ctx))
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
