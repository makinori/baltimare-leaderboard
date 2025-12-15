package http

import (
	"fmt"
	"slices"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/user"
)

func formatShortDuration(duration time.Duration) string {
	if duration < time.Microsecond {
		return fmt.Sprintf("%dns", duration.Nanoseconds())
	} else if duration < time.Millisecond {
		return fmt.Sprintf("%dµs", duration.Microseconds())
	} else if duration < time.Second {
		return fmt.Sprintf("%.1fms", duration.Seconds()*1000)
	} else if duration < time.Second*10 {
		return fmt.Sprintf("%.1fs", duration.Seconds())
	}
	return fmt.Sprintf("%.0fs", duration.Seconds())
}

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
