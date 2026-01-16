package http

import (
	_ "embed"
	"sync"

	"git.ran.cafe/maki/foxlib/foxcss"
	"git.ran.cafe/maki/foxlib/foxhtml"
	"github.com/makinori/baltimare-leaderboard/env"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

var (
	//go:embed font.css
	fontCSS string
	//go:embed page.css
	pageCSS string
	//go:embed page.js
	pageJS string
)

func init() {
	fontCSS = foxcss.MustMinify(fontCSS)
	pageCSS = foxcss.MustMinify(pageCSS)
}

const (
	// https://m2.material.io/design/color/the-color-system.html#tools-for-picking-colors
	ColorRed   = "#f44336" // red 500
	ColorGreen = "#8bc34a" // light green 500
	ColorLime  = "#cddc39" // lime 500
)

func content(data *renderData) (Group, error) {
	stats := getStats(data)

	var wg sync.WaitGroup
	// var mapRenderTime, listRenderTime time.Duration

	var usersMap Node
	wg.Go(func() {
		// startTime := time.Now()
		usersMap = renderMap(data)
		// mapRenderTime = time.Since(startTime)
	})

	var usersList Node
	wg.Go(func() {
		// startTime := time.Now()
		usersList = renderUsers(data, stats.maxMinutes)
		// listRenderTime = time.Since(startTime)
	})

	wg.Wait()

	var logoEl Node

	switch env.AREA {
	case "baltimare":
		logoEl = A(
			Href("https://baltimare.org"),
			Img(
				Class(foxcss.Class(data.ctx, `
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
			Class(foxcss.Class(data.ctx, `
				text-align: center;
				margin-top: 64px;
				margin-bottom: 32px;
				font-size: 64px
			`)),
			Text("cloudsdale"),
		)
	}

	return Group{
		foxhtml.HStack(data.ctx,
			foxhtml.StackCSS(`
				align-items: center;
				justify-content: center;
			`),
			logoEl,
		),
		foxhtml.HStack(data.ctx,
			foxhtml.StackCSS(`
				width: `+mapWidth+`;
				align-items: flex-end;
				margin-bottom: 16px;
				gap: 8px;
				> a {
					opacity: 0.4;
				}
			`),
			renderStats(data.ctx, &stats),
			Div(Class(foxcss.Class(data.ctx, `flex-grow:1`))),
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
	data, err := getRenderData(true, "p-")
	if err != nil {
		return err.Error(), false
	}

	contentGroup, err := content(data)
	if err != nil {
		return err.Error(), false
	}

	var contentDiv = Div(
		Class(foxcss.Class(data.ctx, `
			display: flex;
			justify-content: center;
			width: 100vw;
		`)),
		Div(
			Class(foxcss.Class(data.ctx, `
				width: 800px;
				max-width: 800px;
				margin-bottom: 128px;
			`)),
			contentGroup,
		),
	)

	css := fontCSS + pageCSS + foxcss.GetPageCSS(data.ctx)
	// os.WriteFile("test.css", []byte(css), 0644)

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
