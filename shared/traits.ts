// keep usernames lowercase
// use <first>.<last>
// ignore .resident

export const traitsMap = {
	bot: ["baltimare", "camarea2", "horseheights"],
	janny: [
		"rarapony",
		"vulneria",
		"alphonsedev",
		"musicora.skydancer",
		"blackvinegarcity",
		"firecrakcr",
		"marbiepie",
		"b0gdanoff",
	],
	// image traits
	anonfilly: ["camarea2", "sunshineyelloww", "vrnl"],
	nugget: ["horsehiney"],
	strawberry: ["makidoll", "trixishy"],
	fish: ["fish.enthusiast"],
	floppy: ["wolvan"],
	portalBlue: ["omniportal"],
	portalOrange: ["sophia.naumova"],
	bee: ["zeepon"],
	mareStareMareQuest: ["cuteredmare"],
};

export type Trait = keyof typeof traitsMap;

export const userTraitsMap: Record<string, Trait[]> = Object.entries(
	traitsMap,
).reduce((obj, [trait, usernames]) => {
	for (const username of usernames) {
		if (obj[username] != null) {
			obj[username].push(trait);
		} else {
			obj[username] = [trait];
		}
	}
	return obj;
}, {});

export interface ImageTraitType {
	image: string;
	url: string;
	size: number;
}

export const imageTraitMap: Partial<Record<Trait, ImageTraitType>> = {
	anonfilly: {
		image: "happy-anonfilly.png",
		url: "https://anonfilly.horse",
		size: 24,
	},
	nugget: {
		image: "nugget.png",
		url: "https://www.youtube.com/watch?v=h_CaoxnX_Vc",
		size: 20,
	},
	strawberry: {
		image: "strawberry.png",
		url: "https://www.youtube.com/watch?v=yYSNp1JgkA8",
		size: 20,
	},
	fish: {
		image: "fish.png",
		url: "https://www.youtube.com/watch?v=RHuQqLxmEyg",
		size: 20,
	},
	floppy: {
		image: "floppy.png",
		url: "https://www.youtube.com/watch?v=bLHL75H_VEM",
		size: 20,
	},
	portalBlue: {
		image: "portal-blue.png",
		url: "https://www.youtube.com/watch?v=iuAbwbqNc3A",
		size: 20,
	},
	portalOrange: {
		image: "portal-orange.png",
		url: "https://www.youtube.com/watch?v=iuAbwbqNc3A",
		size: 20,
	},
	bee: {
		image: "bee.png",
		url: "https://www.youtube.com/watch?v=R4MUPVWMnDQ",
		size: 20,
	},
	mareStareMareQuest: {
		image: "mare-stare.png",
		url: "https://store.steampowered.com/search/?developer=ElectroKaplosion%20LLC",
		size: 20,
	},
};

export const imageTraitKeys = Object.keys(imageTraitMap);
