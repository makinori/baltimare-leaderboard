package http

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"sort"
	"strconv"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/database"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/foxlib/foxcss"
	"github.com/mergestat/timediff"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
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

func formatName(userInfo *database.UserInfo) string {
	if userInfo.DisplayName == "" {
		return userInfo.Username
	} else {
		return fmt.Sprintf("%s (%s)", userInfo.DisplayName, userInfo.Username)
	}
}

func renderUser(ctx context.Context, user *database.UserWithID, online bool) Node {
	url := "https://world.secondlife.com/resident/" + user.ID.String()

	// https://wiki.secondlife.com/wiki/Picture_Service
	imageUrl := fmt.Sprintf(
		"https://picture-service.secondlife.com/%s/60x45.jpg",
		user.User.Info.ImageID.String(),
	)

	var lastSeenRow Node
	if online {
		lastSeenRow = Td(
			Class(foxcss.Class(ctx, `
				color: green;
			`)),
			Text("online"),
		)
	} else {
		lastSeenRow = Td(
			Class(foxcss.Class(ctx, `
				color: red;
			`)),
			Text(timediff.TimeDiff(user.User.LastSeen)),
		)
	}

	return Tr(
		Td(A(
			Href(url),
			Img(
				Src(imageUrl),
				Loading("lazy"),
			),
		)),
		Td(Text(formatName(&user.User.Info))),
		// Td(Text(formatUint(user.User.Minutes)+" minutes")),
		Td(Text(formatUint(user.User.Minutes/60)+" hours")),
		lastSeenRow,
	)
}

func renderUsers(
	ctx context.Context, onlineUUIDs []uuid.UUID,
) (Node, uint64, uint64) {
	var total, totalMinutes uint64

	// get users and sort
	// TODO: this could get expensive so we should cache this

	users, err := database.GetUsers()
	if err != nil {
		slog.Error("failed to get users", "err", err)
		return Div(), 0, 0
	}

	var sortedUsers []database.UserWithID

	for i := range users {
		if users[i].User.Minutes >= 120 &&
			!slices.Contains(traitUUIDMap["bot"], users[i].ID) {
			sortedUsers = append(sortedUsers, users[i])
		}
	}

	sort.Slice(sortedUsers, func(i, j int) bool {
		return sortedUsers[i].User.Minutes > sortedUsers[j].User.Minutes
	})

	tableRows := make(Group, len(sortedUsers))
	for i := range sortedUsers {
		online := slices.Contains(onlineUUIDs, sortedUsers[i].ID)

		tableRows[i] = renderUser(ctx, &sortedUsers[i], online)

		total++
		totalMinutes += sortedUsers[i].User.Minutes
	}

	return Table(
		Attr("border", "1"),
		tableRows,
	), total, totalMinutes / 60
}

func renderPage() string {
	ctx := context.Background()
	ctx = foxcss.InitContext(ctx)

	onlineUUIDs := lsl.GetOnlineUUIDs()

	users, total, totalHours := renderUsers(ctx, onlineUUIDs)

	var body = Body(
		H1(Text(env.AREA+" leaderboard")),
		H2(Text("fuck javascript edition")),
		P(
			Text("lore: "),
			A(
				Href("https://mastodon.hotmilk.space/@maki/115690185193300470"),
				Text("https://mastodon.hotmilk.space/@maki/115690185193300470"),
			),
		),
		P(
			Text("promise the page will look just as pretty again soon"),
		),
		P(
			Text("see development here: "),
			A(
				Href("https://github.com/makinori/baltimare-leaderboard"),
				Text("https://github.com/makinori/baltimare-leaderboard"),
			),
		),
		P(
			Text("tor for schizos: "),
			A(
				Href("http://baltimare.hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"),
				Text("http://baltimare.hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"),
			),
		),
		Hr(),
		P(
			Text(fmt.Sprintf(
				"%s online right now", formatUint(uint64(len(onlineUUIDs))),
			)),
			Br(),
			Text(fmt.Sprintf("%s popens seen in total", formatUint(total))),
			Br(),
			Text(fmt.Sprintf("%s hours collectively", formatUint(totalHours))),
		),
		P(
			Text("total time online since august 6th 2024"),
		),
		users,
	)

	css, err := foxcss.RenderSCSS(foxcss.GetPageSCSS(ctx))
	if err != nil {
		slog.Error("failed to render scss", "err", err)
		// dont return empty
	}

	return Group{HTML(
		Head(
			Title(env.AREA+" leaderboard"),
			StyleEl(Raw(css)),
		),
		body,
	)}.String()
}
