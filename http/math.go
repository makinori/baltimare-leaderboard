package http

func clamp(n, min, max int) int {
	if n < min {
		n = min
	} else if n > max {
		n = max
	}
	return n
}
