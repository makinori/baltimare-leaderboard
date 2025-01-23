/** @jsxImportSource @emotion/react */

import { useMemo } from "react";
import type {
	IApiOnlineSims,
	IApiOnlineUser,
	IApiUser,
} from "../server/managers/api-manager";
import { CLOUDSDALE, getAvatarImageOptimized, pythag } from "../shared/utils";
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
		const circleWidth = 16;
		const itterateMoveAmount = 1;

		interface Circle {
			_id: string;
			x: number;
			y: number;
		}

		let circles: IApiOnlineUser[] = onlineUsers.map(user => ({
			_id: user._id,
			region: user.region,
			y: 256 - user.y,
			x:
				user.x +
				(["baltimare", "cloudsdale"].includes(user.region) ? 256 : 0),
		}));

		const findOverlaps = (needle: Circle) => {
			const overlaps = [];

			for (const circle of circles) {
				if (circle == needle) continue;

				const distance = pythag(
					circle.x - needle.x,
					circle.y - needle.y,
				);

				if (distance <= circleWidth) {
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
				const { circle, overlaps } = circlesWithOverlaps[i];

				if (overlaps.length == 0) {
					continue;
				}

				anyOverlaps = true;

				// TODO: normal vector

				let relDirX = 0;
				let relDirY = 0;

				for (const overlap of overlaps) {
					relDirX += circle.x - overlap.x;
					relDirY += circle.y - overlap.y;
				}

				let distance = pythag(relDirX, relDirY);

				if (distance == 0) {
					relDirX = Math.random() * 2 - 1;
					relDirY = Math.random() * 2 - 1;
					distance = pythag(relDirX, relDirY);
				}

				const normalX = relDirX / distance;
				const normalY = relDirY / distance;

				circle.x = circle.x + normalX * itterateMoveAmount;
				circle.y = circle.y + normalY * itterateMoveAmount;
			}

			return anyOverlaps;
		};

		const maxIterationCount = (circleWidth / itterateMoveAmount) * 8;

		// let i = 0;
		// const interval = setInterval(() => {
		// 	if (i >= maxIterationCount) {
		// 		console.log(i);
		// 		clearInterval(interval);
		// 		return;
		// 	}
		// 	console.log("itterate");
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
						width: styleVars.userHeight * 0.75,
						height: styleVars.userHeight * 0.75,
						borderRadius: "999px",
						position: "absolute",
						backgroundColor: "#333",
						backgroundSize: "100% 100%",
						transformOrigin: "50% 50%",
						transform: `translate(-50%, -50%)`,
						transition: styleVars.transition,
						":hover": {
							width: styleVars.userHeight,
							height: styleVars.userHeight,
							zIndex: "999",
						},
					}}
					style={{
						left: (onlineUser.x / 512) * 100 + "%",
						top: (onlineUser.y / 256) * 100 + "%",
						backgroundImage: getAvatarImageOptimized(
							users.find(p => p._id == onlineUser._id)?.info
								?.imageId,
							styleVars.userHeight,
						),
					}}
				></a>
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
