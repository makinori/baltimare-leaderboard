package http

import (
	"context"
	_ "embed"
	"errors"
	"log/slog"
	"sync"

	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
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
	sortedUsers, err := getSortedUsers()
	if err != nil {
		slog.Error("failed to get online users", "err", err)
		return Group{}, errors.New("failed to get online users")
	}

	onlineUsers := lsl.GetData()
	onlineUUIDs := lsl.GetOnlineUUIDs(onlineUsers)

	stats := getStats(sortedUsers, onlineUUIDs)

	var wg sync.WaitGroup
	// var mapRenderTime, listRenderTime time.Duration

	var usersMap Node
	wg.Go(func() {
		// startTime := time.Now()
		usersMap = renderMap(ctx, onlineUsers, sortedUsers)
		// mapRenderTime = time.Since(startTime)
	})

	var usersList Node
	wg.Go(func() {
		// startTime := time.Now()
		usersList = renderUsers(
			ctx, sortedUsers, onlineUUIDs, stats.maxMinutes,
		)
		// listRenderTime = time.Since(startTime)
	})

	wg.Wait()

	var logoEl Node

	switch env.AREA {
	case "baltimare":
		logoEl = A(
			Href("https://baltimare.org"),
			Img(
				Class(foxcss.Class(ctx, `
					width: 600px;
					max-width: 100%;
					align-self: center;
					margin-top: 48px;
					margin-bottom: 16px;
				`)),
				Src("/logos/baltimare-opg.png"),
			),
		)
	case "cloudsdale":
		logoEl = H1(
			Class(foxcss.Class(ctx, `
				text-align: center;
				margin-top: 64px;
				margin-bottom: 32px;
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
				width: `+mapWidth+`;
				align-items: flex-end;
				margin-bottom: 16px;
				gap: 8px;
				> a {
					opacity: 0.4;
				}
			`),
			renderStats(ctx, &stats),
			Div(Class(foxcss.Class(ctx, `flex-grow:1`))),
			A(
				Img(Height("20"), Src("/icons/github.svg")),
				Href("https://github.com/makinori/baltimare-leaderboard"),
			),
			A(
				Img(Height("28"), Src("/icons/tor.svg")),
				Href("http://"+env.AREA+".hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion"),
			),
		),
		usersMap,
		Br(),
		usersList,
		// foxhtml.HStack(ctx,
		// 	foxhtml.StackSCSS(`
		// 		margin-top: 64px;
		// 		text-align: center;
		// 		opacity: 0.3;
		// 		align-items: center;
		// 		justify-content: center;
		// 		width: 100%;
		// 		gap: 32px;
		// 	`),
		// 	Span(Text("map: "+formatShortDuration(mapRenderTime))),
		// 	Span(Text("list: "+formatShortDuration(listRenderTime))),
		// 	Span(Text("total: {{.RenderTime}}")),
		// ),
	}, nil
}

func renderPage() (string, bool) {
	// startTime := time.Now()

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

	html := Group{Doctype(HTML(
		Head(
			TitleEl(Text(string(title)+" Leaderboard")),
			StyleEl(Raw(css)),
			Script(Src("/js/htmx.min.js")),
			Script(Src("/js/idiomorph-ext.min.js")),
			Script(Src("/js/htmx-ext-head-support.min.js")),
		),
		Body(
			Attr("hx-ext", "morph,head-support"),
			contentDiv,
			Script(Raw(pageJS)),
		),
	))}.String()

	// renderTime := time.Since(startTime)
	// html = strings.ReplaceAll(html,
	// 	"{{.RenderTime}}", formatShortDuration(renderTime),
	// )

	return html, true
}
