// keep usernames lowercase
// use <first>.<last>
// ignore .resident

export const userTraitsMap = {
	bot: ["baltimare", "camarea2", "horseheights"],
	// image traits
	anonfilly: ["camarea2", "sunshineyelloww"],
	nugget: ["horsehiney"],
	strawberry: ["makidoll", "trixishy"],
	fish: ["fish.enthusiast"],
	// floppy: ["wolvan"],
	portalBlue: ["omniportal"],
	portalOrange: ["sophia.naumova"],
};

export type Trait = keyof typeof userTraitsMap;

export interface ImageTrait {
	image: string;
	url: string;
	size: number;
}

export const imageTraitMap: Partial<Record<Trait, ImageTrait>> = {
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
		url: "",
		size: 20,
	},
	fish: {
		image: "fish.png",
		url: "https://www.youtube.com/watch?v=RHuQqLxmEyg",
		size: 20,
	},
	// TODO: get floopy image
	// floppy: {
	// 	image: "floppy.png",
	// 	url: "https://www.youtube.com/watch?v=bLHL75H_VEM",
	// 	size: 20,
	// },
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
};

export const imageTraitKeys = Object.keys(imageTraitMap);
