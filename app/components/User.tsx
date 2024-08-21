/** @jsxImportSource @emotion/react */

import { CSSObject } from "@emotion/react";
import styled from "@emotion/styled";
import { getImageProps, ImageProps } from "next/image";
import { useCallback, useMemo, useState } from "react";
import type { IApiUser } from "../../server/users";
import {
	imageTraitKeys,
	imageTraitMap,
	ImageTraitType,
} from "../../shared/traits";
import { useSoundManager } from "../services/SoundManager";
import { styleVars } from "../vars";
import { FlexGrow } from "./FlexGrow";
import { HStack } from "./Stack";

const nullUuidRegex = /^0{8}-0{4}-0{4}-0{4}-0{12}$/;

function addSeperators(n: number) {
	let out: string[] = [];
	const chars = Math.floor(n).toString().split("").reverse();

	for (let i = 0; i < chars.length; i += 3) {
		if (i != 0) out = [...out, ","];
		out = [...out, ...chars.slice(i, i + 3)];
	}

	return out.reverse().join("");
}

function plural(n: number, single: string, plural: string = null) {
	if (plural == null) plural = single + "s";
	if (n == 1 || n == -1) return single;
	else return plural;
}

function formatMinutes(m: number) {
	// if (m < 60) return `${m}m`;
	if (m < 60) return `${m} ${plural(m, "min")}`;
	const h = Math.floor(m / 60);
	// return `${addSeperators(h)}h ${m % 60}m`;
	return `${addSeperators(h)} ${plural(h, "hour")}`;
}

function randomInt(max: number) {
	return Math.floor(Math.random() * max);
}

const DisplayName = styled.div({
	marginLeft: styleVars.userSpacing,
	fontWeight: 800,
	opacity: 0.9,
});

const Username = styled.div({
	marginLeft: styleVars.userSpacing,
	fontSize: 16,
	fontWeight: 700,
	opacity: 0.4,
});

function ImageTrait({ imageTrait }: { imageTrait: ImageTraitType }) {
	const soundManager = useSoundManager();

	const onClick = useCallback(() => {
		soundManager.play("vine-boom.wav", 0.15);
	}, [imageTrait]);

	const hasUrl = imageTrait.url != "";

	const traitImg = (
		<img
			src={"traits/" + imageTrait.image}
			css={{
				height: imageTrait.size,
				marginLeft: styleVars.userSpacing * 1,
				opacity: 1,
			}}
		/>
	);

	return hasUrl ? (
		<a
			href={imageTrait.url}
			css={{
				transition: styleVars.transition,
				":hover": {
					transform: "scale(1.1)",
				},
			}}
			target="_blank"
			onClick={onClick}
		>
			{traitImg}
		</a>
	) : (
		traitImg
	);
}

function TextTrait({ text, janny }: { text: string; janny?: boolean }) {
	const css: CSSObject = {
		padding: "0 5px",
		borderRadius: 4,
		fontSize: 12,
		fontWeight: 700,
		letterSpacing: 0,
		backgroundColor: "#333",
		backgroundSize: "100% 100%",
		color: "#888",
		textShadow: "none",
		marginLeft: styleVars.userSpacing * 1,
		opacity: 1,
		overflow: "hidden",
	};

	if (janny) {
		// const opacity = 0.75;
		// const c = `rgba(51,51,51,${opacity})`; // #333 with alpha
		// const c = `rgba(34,34,34,${opacity})`; // #222 with alpha
		// const c = `rgba(17,17,17,${opacity})`; // #111 with alpha
		// css.backgroundImage = `linear-gradient(0deg, ${c}, ${c}), url(trans-flag.png)`;
		css.backgroundImage = `url(trans-flag-dim.png)`;
		css.color = "#888";
	}

	return <div css={css}>{text}</div>;
}

export function User({
	i,
	user,
	highestMinutes,
}: {
	i: number;
	user: IApiUser;
	highestMinutes: number;
}) {
	const soundManager = useSoundManager();

	const [boopSide, setBoopSide] = useState(-1);

	const name = useMemo(() => {
		if (user.displayName == "") {
			return <DisplayName>{user.username}</DisplayName>;
		} else {
			return (
				<>
					<DisplayName>{user.displayName}</DisplayName>
					<Username>{user.username}</Username>
				</>
			);
		}
	}, [user]);

	const percentage = useMemo(() => user.minutes / highestMinutes, [user]);

	const imageTraits = useMemo(
		() =>
			user.traits
				.filter(t => imageTraitKeys.includes(t))
				.map(t => <ImageTrait key={t} imageTrait={imageTraitMap[t]} />),
		[user],
	);

	const onAvatarDown = useCallback(() => {
		soundManager.play(`squeak-in/${randomInt(5) + 1}.wav` as any, 0.3);
		if (Math.random() < 0.4) {
			if (Math.random() < 0.5) {
				soundManager.play(`squee.wav`, 0.35);
			} else {
				soundManager.play(`boop.wav`, 0.15);
			}
		}
		setBoopSide(boopSide * -1);
	}, [setBoopSide, boopSide]);

	const onAvatarUp = useCallback(() => {
		soundManager.play(`squeak-out/${randomInt(4) + 1}.wav` as any, 0.3);
	}, []);

	const imageProps: ImageProps = {
		alt: "",
		width: styleVars.userHeight,
		height: styleVars.userHeight,
		quality: 90,
		src: "",
	};

	const avatar = getImageProps({
		...imageProps,
		src:
			user.imageId == "" || nullUuidRegex.test(user.imageId)
				? ""
				: "https://picture-service.secondlife.com/" +
				  user.imageId +
				  "/256x192.jpg",
	});

	const unknownAvatar = getImageProps({
		...imageProps,
		src: "/anon-avatar.png",
	});

	return (
		<HStack
			css={{
				height: styleVars.userHeight,
				color: "#fff",
				fontSize: 20,
				letterSpacing: -1,
			}}
		>
			<div
				css={{
					position: "relative",
					flexGrow: 1,
					width: "100%",
					height: "100%",
					borderRadius: styleVars.userCorner,
					// overflow: "hidden",
					backgroundColor: "#222",
				}}
			>
				{/* progress bar */}
				<div
					css={{
						position: "absolute",
						margin: "auto",
						top: 0,
						bottom: 0,
						// right before the border of the player icon
						left: styleVars.userHeight - styleVars.userCorner,
						borderRadius: styleVars.userCorner,
					}}
					style={{
						right: (1 - percentage) * 100 + "%",
						backgroundColor: `hsl(${i * 10}deg, 20%, 30%)`,
					}}
				></div>
				{/* content */}
				<HStack
					css={{
						position: "absolute",
						margin: "auto",
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
						textShadow: styleVars.userShadow,
					}}
				>
					<div
						css={{
							width: styleVars.userHeight,
							height: styleVars.userHeight,
							borderRadius: styleVars.userCorner,
							backgroundColor: "#333",
							backgroundSize: "100% 100%",
							userSelect: "none",
							transition: styleVars.transition,
							cursor: "pointer",
							":hover": {
								transform: "scale(1.1)",
							},
							":active": {
								transform: `scale(0.9) rotate(${
									5 * boopSide
								}deg)`,
							},
						}}
						onPointerDown={onAvatarDown}
						onPointerUp={onAvatarUp}
						style={{
							backgroundImage: `url(${avatar.props.src}), url(${unknownAvatar.props.src})`,
						}}
					></div>
					{name}
					{imageTraits}
					{user.traits.includes("bot") ? (
						<TextTrait text="bot" />
					) : (
						<></>
					)}
					{user.traits.includes("janny") ? (
						<TextTrait text="janny" janny />
					) : (
						<></>
					)}
					<FlexGrow />
					<div
						css={{
							marginRight: styleVars.userSpacing * 1.5,
							fontWeight: 700,
							opacity: 0.6,
							textAlign: "right",
						}}
					>
						{formatMinutes(user.minutes)}
					</div>
				</HStack>
			</div>
			<a href={"https://world.secondlife.com/resident/" + user._id}>
				<HStack
					css={{
						width: 80,
						height: "100%",
						fontSize: 16,
						fontWeight: 700,
						justifyContent: "flex-start",
						marginLeft: styleVars.userSpacing * 0.75,
						whiteSpace: "nowrap",
					}}
				>
					<div
						css={{
							width: 6,
							height: 24,
							borderRadius: 4,
							backgroundColor: user.online
								? "#8BC34A"
								: "#F44336",
							marginRight: styleVars.userSpacing * 0.75,
						}}
					></div>
					<div css={{ opacity: 0.4 }}>{user.lastSeenText}</div>
				</HStack>
			</a>
		</HStack>
	);
}
