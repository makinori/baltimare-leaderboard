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
