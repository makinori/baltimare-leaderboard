// keep usernames lowercase
// use <first>.<last>
// ignore .resident

export const traitsMap = {
	bot: [
		"7c85b653-9af4-408a-936e-7c116d98d99a", // baltimare
		"cc53d796-c678-4f55-beea-3ee343b558c6", // camarea2
		"bf4d245a-35a2-44d2-a9e3-a3f0ae35e104", // horseheights
	],
	janny: [
		"0d03cff1-1e7e-4398-97fe-d8b2a1419e8d", // rarapony
		"ebce47e6-b055-4b9b-bdc8-3d12fb09bcb4", // neri
		"f3fb943d-20d8-48dd-9413-c1ab046ea8a8", // alpharush
		// "musicora.skydancer", // flutterbutter?
		// "blackvinegarcity", // kuro?
		"309d61b5-6f2d-42e1-bc95-000d00318d61", // tea
		"a2d78525-a55a-4601-9f5f-81db31695f0a", // marble
		"60c54dc2-f46b-41f2-8678-071d93655834", // boggy
	],
	// image traits
	anonfilly: [
		"cc53d796-c678-4f55-beea-3ee343b558c6", // camarea2
		"1cedf5f7-b556-477a-a7bc-dcbf6b2e9096", // sunshineyelloww
		"a31fc8dc-5d82-477e-b81d-1dc74c63d897", // bun
	],
	nugget: [
		"fbc5881b-c3ec-4996-8e03-110f95e4aaf0", // hind
	],
	strawberry: [
		"b1f4f7a5-972d-4b73-a3d3-cd286d9e0772", // zydney
	],
	fish: [
		"44fb6569-017f-4dbc-8f2c-975c39ce33e8", // fish enthusiast
		"b7c5f366-7a39-4289-8157-d3a8ae6d57f4", // maki
	],
	floppy: [
		"4d6ed11a-1280-4743-b147-52bea3144600", // wolvan
	],
	portalBlue: [
		"5fa2c141-7cd3-4d56-a4e2-e26797753803", // tapioca omniportal
	],
	portalOrange: [
		"62240c57-b55a-4f0e-a435-c1c80d5e8c3a", // tapioca sophia.naumova
	],
	bee: [
		"37e6d943-76cc-4d2f-9f1d-5ad037ea2f24", // zee
	],
	mareStareMareQuest: [
		"621c7346-ddc8-4bbd-9c01-eab111507c00", // red
	],
	blueFastStudios: [
		"02bc27c8-47f6-4f1e-94e5-0aee6fa955a2", // skyline
	],
};

export type Trait = keyof typeof traitsMap;

export const userTraitsMap: Record<string, Trait[]> = Object.entries(
	traitsMap,
).reduce((obj, [trait, uuids]) => {
	for (let uuid of uuids) {
		uuid = uuid.toLowerCase();
		if (obj[uuid] != null) {
			obj[uuid].push(trait);
		} else {
			obj[uuid] = [trait];
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
	blueFastStudios: {
		image: "blue-fast-studios.png",
		url: "https://bluefaststud.io",
		size: 20,
	},
};

export const imageTraitKeys = Object.keys(imageTraitMap);
