package http

import (
	"context"
	"fmt"
	"log/slog"
	"slices"
	"sort"
	"strconv"

	"github.com/makinori/baltimare-leaderboard/database"
	"github.com/makinori/baltimare-leaderboard/env"
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

func renderUser(user *database.UserWithID) Node {
	url := "https://world.secondlife.com/resident/" + user.ID.String()

	// https://wiki.secondlife.com/wiki/Picture_Service
	imageUrl := fmt.Sprintf(
		"https://picture-service.secondlife.com/%s/60x45.jpg",
		user.User.Info.ImageID.String(),
	)

	lastSeen := timediff.TimeDiff(user.User.LastSeen)

	return Tr(
		Td(A(
			Href(url),
			Img(
				Src(imageUrl),
				Loading("lazy"),
			),
		)),
		Td(Text(user.User.Info.DisplayName)),
		Td(Text(user.User.Info.Username)),
		Td(Text(formatUint(user.User.Minutes/60)+" hours")),
		Td(Text(lastSeen)),
	)
}

func renderUsers() (Node, uint64, uint64) {
	var total, totalMinutes uint64

	// get users and sort
	// TODO: this could get expensive so we should cache this

	users, err := database.GetUsers()
	if err != nil {
		return Div(), 0, 0
	}

	var sortedUsers []database.UserWithID

	for i := range users {
		if users[i].User.Minutes >= 120 &&
			!slices.Contains(traitMap["bot"], users[i].ID.String()) {
			sortedUsers = append(sortedUsers, users[i])
		}
	}

	sort.Slice(sortedUsers, func(i, j int) bool {
		return sortedUsers[i].User.Minutes > sortedUsers[j].User.Minutes
	})

	tableRows := make(Group, len(sortedUsers))
	for i := range sortedUsers {
		tableRows[i] = renderUser(&sortedUsers[i])

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

	users, total, totalHours := renderUsers()

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
			Text("currently not tracking. will be functional soon."),
			Br(),
			Text("i promise the page will look just as pretty again."),
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
		P(Text(
			fmt.Sprintf("%s popens seen in total", formatUint(total)),
		)),
		P(Text(
			fmt.Sprintf("%s hours collectively", formatUint(totalHours)),
		)),
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
