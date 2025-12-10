package http

import (
	"github.com/google/uuid"
)

var traitUUIDMap = map[string][]uuid.UUID{
	"bot": {
		uuid.MustParse("7c85b653-9af4-408a-936e-7c116d98d99a"), // baltimare
		uuid.MustParse("cc53d796-c678-4f55-beea-3ee343b558c6"), // camarea2
		uuid.MustParse("bf4d245a-35a2-44d2-a9e3-a3f0ae35e104"), // horseheights
	},
	"janny": {
		uuid.MustParse("0d03cff1-1e7e-4398-97fe-d8b2a1419e8d"), // rarapony
		uuid.MustParse("ebce47e6-b055-4b9b-bdc8-3d12fb09bcb4"), // neri
		uuid.MustParse("f3fb943d-20d8-48dd-9413-c1ab046ea8a8"), // alpharush
		// "musicora.skydancer", // flutterbutter?
		// "blackvinegarcity", // kuro?
		uuid.MustParse("309d61b5-6f2d-42e1-bc95-000d00318d61"), // tea
		uuid.MustParse("a2d78525-a55a-4601-9f5f-81db31695f0a"), // marble
		uuid.MustParse("60c54dc2-f46b-41f2-8678-071d93655834"), // boggy
	},
	// image traits
	"anonfilly": {
		uuid.MustParse("cc53d796-c678-4f55-beea-3ee343b558c6"), // camarea2
		uuid.MustParse("1cedf5f7-b556-477a-a7bc-dcbf6b2e9096"), // sunshineyelloww
		uuid.MustParse("a31fc8dc-5d82-477e-b81d-1dc74c63d897"), // bun
	},
	"nugget": {
		uuid.MustParse("fbc5881b-c3ec-4996-8e03-110f95e4aaf0"), // hind
	},
	"strawberry": {
		uuid.MustParse("b1f4f7a5-972d-4b73-a3d3-cd286d9e0772"), // zydney
	},
	"fish": {
		uuid.MustParse("44fb6569-017f-4dbc-8f2c-975c39ce33e8"), // fish enthusiast
		uuid.MustParse("b7c5f366-7a39-4289-8157-d3a8ae6d57f4"), // maki
	},
	"floppy": {
		uuid.MustParse("4d6ed11a-1280-4743-b147-52bea3144600"), // wolvan
	},
	"portalBlue": {
		uuid.MustParse("5fa2c141-7cd3-4d56-a4e2-e26797753803"), // tapioca omniportal
	},
	"portalOrange": {
		uuid.MustParse("62240c57-b55a-4f0e-a435-c1c80d5e8c3a"), // tapioca sophia.naumova
	},
	"bee": {
		uuid.MustParse("37e6d943-76cc-4d2f-9f1d-5ad037ea2f24"), // zee
	},
	"mareStareMareQuest": {
		uuid.MustParse("621c7346-ddc8-4bbd-9c01-eab111507c00"), // red
	},
	"blueFastStudios": {
		uuid.MustParse("02bc27c8-47f6-4f1e-94e5-0aee6fa955a2"), // skyline
	},
}

var uuidTraitMap = map[uuid.UUID][]string{}

func init() {
	// flip inside out for easy access

	for trait, uuids := range traitUUIDMap {
		for i := range uuids {
			traits := uuidTraitMap[uuids[i]]
			traits = append(traits, trait)
			uuidTraitMap[uuids[i]] = traits
		}
	}
}
