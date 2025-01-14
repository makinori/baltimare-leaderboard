/** @jsxImportSource @emotion/react */

import type {
	IApiOnlineSims,
	IApiOnlineUser,
	IApiUser,
} from "../server/managers/api-manager";
import { getAvatarImageOptimized } from "../shared/utils";
import { styleVars } from "../shared/vars";
import { CLOUDSDALE } from "../shared/utils";
import cloudsdaleMapImage from "./assets/cloudsdale-map.jpg";
import baltimareMapImage from "./assets/mapcropped3.webp";

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
			{onlineUsers.map(onlineUser => (
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
						left:
							(onlineUser.x / 256) * 50 +
							(["horseheights", "clouddistrict"].includes(
								onlineUser.region,
							)
								? 0
								: 50) +
							"%",
						top: (onlineUser.y / 256) * -100 + 100 + "%",
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
