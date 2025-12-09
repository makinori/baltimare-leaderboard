package main

import (
	"fmt"
	"slices"
	"strconv"

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

func renderUser(user *UserWithID) Node {
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

	tableRows := make(Group, len(tempStaticUsers))
	for i := range tempStaticUsers {
		tableRows[i] = renderUser(&tempStaticUsers[i])

		total++
		totalMinutes += tempStaticUsers[i].User.Minutes
	}

	return Table(
		Attr("border", "1"),
		tableRows,
	), total, totalMinutes / 60
}

func renderPage() string {
	// > 609 popens seen in total
	// > 415,715 hours collectively

	users, total, totalHours := renderUsers()

	var body = Body(
		H1(Text(ENV_NAME+" leaderboard")),
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

	return Group{HTML(
		Head(
			Title(ENV_NAME+" leaderboard"),
		),
		body,
	)}.String()
}
