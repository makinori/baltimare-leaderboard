package http

import (
	"context"
	_ "embed"
	"errors"
	"log/slog"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/makinori/foxlib/foxcss"
	"github.com/makinori/foxlib/foxhtml"
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

func content(ctx context.Context) (Group, error) {
	// get users and sort
	// TODO: this could get expensive so maybe we should cache this
	// TODO: these data structures are also ineffecient

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
		P(
			Class(foxcss.Class(ctx, `
				margin-top: 64px;
				text-align: center;
				opacity: 0.3;
			`)),
			Text("{{.RenderTime}} to render"),
		),
	}, nil
}

func renderPage() (string, bool) {
	startTime := time.Now()

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

	title := []byte(env.AREA)
	title[0] -= 32 // uppercase

	html := Group{HTML(
		Head(
			TitleEl(Text(string(title)+" Leaderboard")),
			StyleEl(Raw(css)),
		),
		Body(
			contentDiv,
			Script(Raw(pageJS)),
		),
	)}.String()

	renderTime := time.Since(startTime)
	html = strings.ReplaceAll(html,
		"{{.RenderTime}}", formatShortDuration(renderTime),
	)

	return html, true
}
