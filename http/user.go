package http

import (
	"context"
	_ "embed"
	"fmt"
	"slices"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/makinori/foxlib/foxcss"
	"github.com/makinori/foxlib/foxhtml"
	"github.com/mergestat/timediff"
	. "maragu.dev/gomponents"
	. "maragu.dev/gomponents/html"
)

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
		statusText = strings.ReplaceAll(statusText, "ago", "")
		statusText = strings.TrimSpace(statusText)
	}

	return foxhtml.HStack(ctx,
		ID(user.ID.String()),
		foxhtml.StackSCSS(`
			font-size: 20px;
			letter-spacing: -1px;
			width: 100%;
			height: 32px;
			align-items: center;
			gap: 0;

			@for $i from 0 through 35 {
				&:nth-child(36n + #{$i + 1}) .progress-bar {
					background: hsl($i * 10deg, 20%, 30%)
				}
			}

			.avatar-icon {
				width: 32px;
				height: 32px;
				border-radius: 8px;
				cursor: pointer;
				transition: all 100ms ease;
				user-select: none;
				z-index: 10;
				&:hover {
					transform: scale(1.1);
				}
				&.in-left {
					transform: scale(0.9) rotate(-5deg);
				}
				&.in-right {
					transform: scale(0.9) rotate(5deg);
				}
			}

			.image-trait {
				transition: all 100ms ease;
				&:hover {
					transform: scale(1.1);
				}	
			}
		`),
		Img(
			Class("avatar-icon"),
			Src(getImageURL(user.User.Info.ImageID)),
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
				foxhtml.StackSCSS(`
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
						text-shadow: 2px 2px 0px rgba(#111, 0.4);
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

func renderUsers(
	ctx context.Context, sortedUsers []user.UserWithID, onlineUUIDs []uuid.UUID,
) (Node, uint64, uint64) {
	var total, totalMinutes uint64

	var maxMinutes uint64
	for i := range sortedUsers {
		if sortedUsers[i].Minutes > maxMinutes {
			maxMinutes = sortedUsers[i].Minutes
		}
	}

	userEls := make(Group, len(sortedUsers))
	for i := range sortedUsers {
		online := slices.Contains(onlineUUIDs, sortedUsers[i].ID)

		userEls[i] = renderUser(ctx, &sortedUsers[i], online, maxMinutes)

		total++
		totalMinutes += sortedUsers[i].User.Minutes
	}

	return foxhtml.VStack(ctx,
		foxhtml.StackSCSS(`
			gap: 4px;
		`),
		userEls,
	), total, totalMinutes / 60
}
