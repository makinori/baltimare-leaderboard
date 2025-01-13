/** @jsxImportSource @emotion/react */

import type { IApiOnlineUser, IApiUser } from "../server/managers/api-manager";
import { getAvatarImageOptimized } from "../shared/utils";
import { styleVars } from "../shared/vars";
import mapImage from "./assets/mapcropped3.webp";

const aspectRatio = mapImage.width / mapImage.height;

export function UsersMap({
	users,
	onlineUsers,
	className,
}: {
	users: IApiUser[];
	onlineUsers: IApiOnlineUser[];
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
				backgroundSize: "100% 100%",
				borderRadius: styleVars.userCorner,
				...(process.env.NEXT_PUBLIC_CLOUDSDALE
					? {}
					: {
							backgroundImage: `url(${mapImage.src})`,
					  }),
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
				<div
					key={onlineUser.region + "-" + onlineUser._id}
					css={{
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
							(onlineUser.region == "horseheights" ? 0 : 50) +
							"%",
						top: (onlineUser.y / 256) * -100 + 100 + "%",
						backgroundImage: getAvatarImageOptimized(
							users.find(p => p._id == onlineUser._id)?.info
								?.imageId,
							styleVars.userHeight,
						),
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
