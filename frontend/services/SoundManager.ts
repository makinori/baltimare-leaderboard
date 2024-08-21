import { create } from "zustand";

const soundFiles = [
	"squeak-in/1.wav",
	"squeak-in/2.wav",
	"squeak-in/3.wav",
	"squeak-in/4.wav",
	"squeak-in/5.wav",
	"squeak-out/1.wav",
	"squeak-out/2.wav",
	"squeak-out/3.wav",
	"squeak-out/4.wav",
	"squeak-out/5.wav",
	"boop.wav",
	"squee.wav",
	"vine-boom.wav",
] as const;

type SoundFile = (typeof soundFiles)[number];

interface SoundManager {
	active: boolean;
	downloaded: Partial<Record<SoundFile, string>>;
	play: (name: SoundFile, volume: number) => void;
	init: () => void;
}

// idk kek react meme

export const useSoundManager = create<SoundManager>()((set, get) => ({
	active: false,
	downloaded: {},
	play(name, volume = 1) {
		const url = get().downloaded[name];
		if (url == null) return;
		const audio = new Audio(url);
		audio.volume = volume;
		audio.play();
	},
	init() {
		if (get().active) return;
		if (import.meta.env.SSR) return;

		set(m => {
			m.active = true;

			for (const filename of soundFiles) {
				fetch("sounds/" + filename)
					.then(async res => {
						m.downloaded[filename] = URL.createObjectURL(
							await res.blob(),
						);
					})
					.catch(error => {
						console.error(error);
					});
			}

			return m;
		});
	},
}));
