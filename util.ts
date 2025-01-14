export const CLOUDSDALE =
	typeof window !== "undefined"
		? !!process.env.NEXT_PUBLIC_CLOUDSDALE
		: !!process.env.CLOUDSDALE;
