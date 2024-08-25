/** @jsxImportSource @emotion/react */

import type { IApiOnlineUsersSeperated } from "../server/api/lsl";
import type { IApiUser } from "../server/api/users";
import { getAvatarImageOptimized } from "../shared/utils";
import { styleVars } from "../shared/vars";
import mapImage from "./assets/mapcropped3.webp";

const aspectRatio = mapImage.width / mapImage.height;

export function UsersMap(props: {
	users: IApiUser[];
	positions: IApiOnlineUsersSeperated;
	className?: string;
}) {
	return (
		<div
			className={props.className}
			css={{
				position: "relative",
				width: "100%",
				aspectRatio,
				backgroundImage: `url(${mapImage.src})`,
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
			{Object.entries(props.positions).map(([where, users]) =>
				users.map(user => (
					<div
						key={where + "-" + user.uuid}
						css={{
							width: styleVars.userHeight * 0.75,
							height: styleVars.userHeight * 0.75,
							borderRadius: "999px",
							position: "absolute",
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
								(user.x / 256) * 50 +
								(where == "horseheights" ? 0 : 50) +
								"%",
							top: (user.y / 256) * -100 + 100 + "%",
							backgroundImage: getAvatarImageOptimized(
								props.users.find(p => p._id == user.uuid)
									?.imageId,
								styleVars.userHeight,
							),
						}}
					></div>
				)),
			)}
		</div>
	);
}
