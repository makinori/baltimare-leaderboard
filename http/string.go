package http

import (
	"fmt"
	"time"
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
