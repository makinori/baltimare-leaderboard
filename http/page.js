setInterval(() => {
	document.location.reload();
}, 1000 * 60);

// avatar icon animation

function sound(url) {
	const audio = new Audio();
	audio.src = url;
	audio.preload = "auto";
	return volume => {
		let tmp = audio.cloneNode();
		tmp.volume = volume;
		tmp.addEventListener("ended", () => {
			tmp.remove();
		});
		tmp.play().catch(err => {
			console.error(err);
			tmp.remove();
		});
	};
}

let soundBoop = sound("/sounds/boop.wav");
let soundSquee = sound("/sounds/squee.wav");
let soundsSqueakIn = [
	sound("/sounds/squeak-in/1.wav"),
	sound("/sounds/squeak-in/2.wav"),
	sound("/sounds/squeak-in/3.wav"),
	sound("/sounds/squeak-in/4.wav"),
	sound("/sounds/squeak-in/5.wav"),
];
let soundsSqueakOut = [
	sound("/sounds/squeak-out/1.wav"),
	sound("/sounds/squeak-out/2.wav"),
	sound("/sounds/squeak-out/3.wav"),
	sound("/sounds/squeak-out/4.wav"),
	sound("/sounds/squeak-out/5.wav"),
];

function onAvatarDown(e) {
	let inClass = "";
	if (Math.random() < 0.5) {
		inClass = "in-left";
	} else {
		inClass = "in-right";
	}

	e.target.className = "avatar-icon " + inClass;

	let squeakIndex = Math.floor(Math.random() * soundsSqueakIn.length);
	soundsSqueakIn[squeakIndex](0.3);

	if (Math.random() < 0.4) {
		if (Math.random() < 0.5) {
			soundSquee(0.35);
		} else {
			soundBoop(0.15);
		}
	}
}

function onAvatarUp(e) {
	e.target.className = "avatar-icon";

	let squeakIndex = Math.floor(Math.random() * soundsSqueakIn.length);
	soundsSqueakOut[squeakIndex](0.3);
}

document.querySelectorAll(".avatar-icon").forEach(avatarIcon => {
	avatarIcon.addEventListener("mousedown", onAvatarDown);
	avatarIcon.addEventListener("mouseup", onAvatarUp);
});
