package http

import (
	"context"
	"log/slog"

	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/foxlib/foxcss"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

type stats struct {
	users        uint64
	online       uint64
	totalMinutes uint64
	maxMinutes   uint64
}

func getStats(data *renderData) stats {
	stats := stats{}

	for range data.onlineUUIDs {
		stats.online++
	}

	for i := range data.users {
		stats.users++
		stats.totalMinutes += data.users[i].Minutes
		if data.users[i].Minutes > stats.maxMinutes {
			stats.maxMinutes = data.users[i].Minutes
		}
	}

	return stats
}

func renderStats(ctx context.Context, stats *stats) Node {
	sinceText := ""
	switch env.AREA {
	case "baltimare":
		sinceText = "august 6th 2024"
	case "cloudsdale":
		sinceText = "january 13th 2025"
	}

	return Div(
		Attr("hx-get", "/hx/stats"),
		Attr("hx-swap", "morph:outerHTML"),
		Attr("hx-trigger", "every 1m"),
		P(
			Class(foxcss.Class(ctx, `
					font-weight: 700;
					line-height: 1.1em;
					color: rgba(`+ColorGreen+`, 0.6);
					span {
						color: `+ColorGreen+`;
					}
					margin-bottom: 12px;
				`)),
			Text("> "),
			Span(Text(formatUint(stats.online)+" online")),
			Text(" right now"),
			Br(),
			Text("> "),
			Span(Text(formatUint(stats.users)+" popens")),
			Text(" seen in total"),
			Br(),
			Text("> "),
			Span(Text(formatUint(stats.totalMinutes/60)+" hours")),
			Text(" collectively"),
		),
		P(
			Class(foxcss.Class(ctx, `
					font-weight: 700;
					line-height: 1.1em;
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
	)
}

func renderOnlyStats() (string, bool) {
	data, err := getRenderData(false, "s-")
	if err != nil {
		return err.Error(), false
	}

	stats := getStats(data)

	node := renderStats(data.ctx, &stats)

	css, err := foxcss.RenderSCSS(foxcss.GetPageSCSS(data.ctx))
	if err != nil {
		slog.Error("failed to only render stats", "err", err)
		return "failed to only render stats", false
	}

	html := Group{
		Head(StyleEl(Raw(css))),
		node,
	}.String()

	return html, true
}
