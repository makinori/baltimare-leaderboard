package http

import "math"

func clamp[T int | float64](n, min, max T) T {
	if n < min {
		n = min
	} else if n > max {
		n = max
	}
	return n
}

func distance(x, y float64) float64 {
	return math.Sqrt(math.Pow(x, 2) + math.Pow(y, 2))
}
