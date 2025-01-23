import { getImageProps, ImageProps } from "next/image";

export const CLOUDSDALE =
	typeof window !== "undefined"
		? !!process.env.NEXT_PUBLIC_CLOUDSDALE
		: !!process.env.CLOUDSDALE;

export function addSeperators(n: number) {
	let out: string[] = [];
	const chars = Math.floor(n).toString().split("").reverse();

	for (let i = 0; i < chars.length; i += 3) {
		if (i != 0) out = [...out, ","];
		out = [...out, ...chars.slice(i, i + 3)];
	}

	return out.reverse().join("");
}

export function plural(n: number, single: string, plural: string = null) {
	if (plural == null) plural = single + "s";
	if (n == 1 || n == -1) return single;
	else return plural;
}

export function formatMinutes(m: number) {
	// if (m < 60) return `${m}m`;
	if (m < 60) return `${m} ${plural(m, "min")}`;
	const h = Math.floor(m / 60);
	// return `${addSeperators(h)}h ${m % 60}m`;
	return `${addSeperators(h)} ${plural(h, "hour")}`;
}

export function randomInt(max: number) {
	return Math.floor(Math.random() * max);
}

export const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

export function getAvatarImage(imageId: string) {
	if (imageId == null || imageId == "" || nullUuidRegex.test(imageId)) {
		return "";
	}
	return `https://picture-service.secondlife.com/${imageId}/256x192.jpg`;
}

export function getAvatarImageOptimized(imageId: string, size: number) {
	const imageProps: ImageProps = {
		width: size,
		height: size,
		quality: 90,
		src: "",
		alt: "",
	};

	const avatar = getImageProps({
		...imageProps,
		src: getAvatarImage(imageId),
	});

	const unknownAvatar = getImageProps({
		...imageProps,
		src: "/anon-avatar.png",
	});

	return `url(${avatar.props.src}), url(${unknownAvatar.props.src})`;
}

export function isTourist(minutes: number) {
	return minutes < 60 * 2; // hours
}

export function distance(x: number, y: number) {
	return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function normalize(x: number, y: number) {
	let d = distance(x, y);

	if (d == 0) {
		// x = Math.random() * 2 - 1;
		// y = Math.random() * 2 - 1;
		// guess we doin an upwards bias for determinism
		x = 0;
		y = 1;
		d = distance(x, y);
	}

	return [x / d, y / d];
}
