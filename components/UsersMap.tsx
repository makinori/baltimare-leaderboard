/** @jsxImportSource @emotion/react */

import { useMemo } from "react";
import type {
	IApiOnlineSims,
	IApiOnlineUser,
	IApiUser,
} from "../server/managers/api-manager";
import {
	CLOUDSDALE,
	distance,
	getAvatarImageOptimized,
	normalizeWithSeed,
	uuidAsRandSeed,
} from "../shared/utils";
import { styleVars } from "../shared/vars";
import baltimareMapImage from "./assets/baltimare-map.webp";
import cloudsdaleMapImage from "./assets/cloudsdale-map.jpg";

const aspectRatio = CLOUDSDALE
	? cloudsdaleMapImage.width / cloudsdaleMapImage.height
	: baltimareMapImage.width / baltimareMapImage.height;

export function UsersMap({
	users,
	onlineUsers,
	health,
	className,
}: {
	users: IApiUser[];
	onlineUsers: IApiOnlineUser[];
	health: IApiOnlineSims;
	className?: string;
}) {
	// const [circlePackedOnlineUsers, setCirclePackedOnlineUsers] = useState<
	// 	IApiOnlineUser[]
	// >([]);

	// useEffect(() => {
	const circlePackedOnlineUsers = useMemo(() => {
		const circleDiameter = 16;
		const movePerIteration = 2;

		let circles: IApiOnlineUser[] = onlineUsers.map(user => ({
			_id: user._id,
			region: user.region,
			y: 256 - user.y,
			x:
				user.x +
				(["baltimare", "cloudsdale"].includes(user.region) ? 256 : 0),
		}));

		const findOverlaps = (needle: IApiOnlineUser) => {
			const overlaps = [];

			for (const circle of circles) {
				if (circle == needle) continue;

				const d = distance(circle.x - needle.x, circle.y - needle.y);

				if (d <= circleDiameter) {
					overlaps.push(circle);
				}
			}

			return overlaps;
		};

		const iterate = () => {
			let anyOverlaps = false;

			const circlesWithOverlaps = circles.map((circle, i) => ({
				circle,
				overlaps: findOverlaps(circle),
			}));

			circlesWithOverlaps.sort(
				(a, b) => a.overlaps.length - b.overlaps.length,
			);

			for (let i = 0; i < circlesWithOverlaps.length; i++) {
				const { circle } = circlesWithOverlaps[i];

				const seed = uuidAsRandSeed(circle._id);

				// need to get new ones since we're moving stuff around
				const overlaps = findOverlaps(circle);

				if (overlaps.length == 0) {
					continue;
				}

				anyOverlaps = true;

				// fix

				let relDirX = 0;
				let relDirY = 0;

				for (const overlap of overlaps) {
					let currentDirX = circle.x - overlap.x;
					let currentDirY = circle.y - overlap.y;

					// const d = Math.min(distance(currentDirX, currentDirY));
					// if (d == 0) continue;

					// currentDirX =
					// 	(currentDirX / d) * Math.min(circleDiameter - d, 0);
					// currentDirY =
					// 	(currentDirY / d) * Math.min(circleDiameter - d, 0);

					[currentDirX, currentDirY] = normalizeWithSeed(
						currentDirX,
						currentDirY,
						seed,
					);

					relDirX += currentDirX;
					relDirY += currentDirY;
				}

				const [normalX, normalY] = normalizeWithSeed(
					relDirX,
					relDirY,
					seed,
				);

				circle.x += normalX * movePerIteration;
				circle.y += normalY * movePerIteration;
			}

			return anyOverlaps;
		};

		const maxIterationCount = (circleDiameter / movePerIteration) * 8;
		// const maxIterationCount = 1000;

		// console.log(maxIterationCount);

		// let i = 0;
		// const interval = setInterval(() => {
		// 	if (i >= maxIterationCount) {
		// 		console.log(i);
		// 		clearInterval(interval);
		// 		return;
		// 	}
		// 	console.log("iterate");
		// 	if (iterate() == false) {
		// 		console.log(i);
		// 		clearInterval(interval);
		// 		return;
		// 	}
		// 	setCirclePackedOnlineUsers(JSON.parse(JSON.stringify(circles)));
		// 	i++;
		// }, 5);

		for (let i = 0; i < maxIterationCount; i++) {
			if (!iterate()) {
				break;
			}
		}

		// console.log("done");

		return circles;
	}, [onlineUsers]);

	return (
		<div
			className={className}
			css={{
				position: "relative",
				width: "100%",
				aspectRatio,
				backgroundColor: "rgba(255,255,255,0.1)",
				backgroundImage: `url(${
					CLOUDSDALE ? cloudsdaleMapImage.src : baltimareMapImage.src
				})`,
				backgroundSize: "100% 100%",
				borderRadius: styleVars.userCorner,
			}}
		>
			<div
				css={{
					position: "absolute",
					width: "100%",
					height: "100%",
					borderRadius: styleVars.userCorner,
					background: "#111",
					opacity: 0.5,
				}}
			></div>
			{circlePackedOnlineUsers.map(onlineUser => (
				<a
					key={onlineUser.region + "-" + onlineUser._id}
					href={"#" + onlineUser._id}
					css={{
						display: "block",
						width: styleVars.userHeight,
						height: styleVars.userHeight,
						position: "absolute",
						transformOrigin: "50% 50%",
						transform: `translate(-50%, -50%)`,
						transition: styleVars.transition,
						":hover": {
							zIndex: 1000,
						},
						":hover .icon": {
							width: styleVars.userHeight,
							height: styleVars.userHeight,
						},
						":hover .name": {
							opacity: 1,
						},
					}}
					style={{
						left: (onlineUser.x / 512) * 100 + "%",
						top: (onlineUser.y / 256) * 100 + "%",
					}}
				>
					<div
						className="icon"
						css={{
							position: "absolute",
							margin: "auto",
							top: 0,
							right: 0,
							bottom: 0,
							left: 0,
							width: styleVars.userHeight * 0.75,
							height: styleVars.userHeight * 0.75,
							backgroundColor: "#333",
							backgroundSize: "100% 100%",
							borderRadius: 999,
							transition: styleVars.transition,
						}}
						style={{
							backgroundImage: getAvatarImageOptimized(
								users.find(p => p._id == onlineUser._id)?.info
									?.imageId,
								styleVars.userHeight,
							),
						}}
					></div>
					<div
						className="name"
						css={{
							position: "absolute",
							margin: "auto",
							left: "calc(100% + 3px)",
							top: 0,
							paddingTop: 3,
							paddingBottom: 3,
							paddingLeft: 6,
							paddingRight: 6,
							fontWeight: 800,
							width: "max-content",
							// when unhover, moves back in zindex
							// can't force global zindex on child elements
							// prettier to just have no transitions
							// transition: styleVars.transitionFast,
							opacity: 0,
							overflow: "hidden",
							pointerEvents: "none",
							textAlign: "left",
							backgroundColor: "#111",
							// border: "solid 1px #333",
							borderRadius: 8,
						}}
					>
						{(() => {
							const info = users.find(
								p => p._id == onlineUser._id,
							)?.info;
							return info?.displayName || info?.username;
						})()}
					</div>
				</a>
			))}
			{[
				health["horseheights"] || health["clouddistrict"],
				health["baltimare"] || health["cloudsdale"],
			].map((online, i) => (
				<div
					key={i}
					css={{
						position: "absolute",
						// margin: "auto",
						top: 0,
						...(i == 0 ? { left: 0 } : { right: 0 }),
						width: 8,
						height: 8,
						margin: 6,
						borderRadius: 999,
					}}
					style={{
						backgroundColor: online ? "#8BC34A" : "#F44336",
					}}
				></div>
			))}
			<p
				css={{
					position: "absolute",
					margin: "auto",
					bottom: 6,
					left: 8,
					opacity: 0.4,
					fontWeight: 600,
				}}
			>
				work in progress
			</p>
		</div>
	);
}
