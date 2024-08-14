import type { Trait } from "../server/main";

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
};

export const imageTraitKeys = Object.keys(imageTraitMap);
