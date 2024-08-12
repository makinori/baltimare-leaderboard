import Cron from "croner";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import type { IUser } from "../../server/users";
import { FlexGrow } from "./FlexGrow";
import { User } from "./User";

export function App() {
	const [users, setUsers] = useState<IUser[]>([]);

	const updateUsers = useCallback(async () => {
		const res = await fetch("/api/users");
		setUsers(await res.json());
	}, [setUsers]);

	useEffect(() => {
		updateUsers();
		// every minute, 30 seconds in
		const job = Cron("30 * * * * *", updateUsers);
		return () => {
			job.stop();
		};
	}, [updateUsers]);

	const highestMinutes = useMemo(() => {
		let highest = 0;
		for (const user of users) {
			if (user.minutes > highest) {
				highest = user.minutes;
			}
		}
		return highest;
	}, [users]);

	return (
		<>
			<a href="https://baltimare.pages.dev">
				<img
					css={{
						width: "calc(100vw - 16px)",
						maxWidth: 600,
						marginTop: 32,
					}}
					src="baltimare-opg.png"
				></img>
			</a>
			<div
				css={{
					marginTop: 16,
					marginBottom: 8,
					fontWeight: 800,
					fontSize: 20,
					display: "flex",
					width: "calc(100vw - 16px - 8px)",
					maxWidth: 800 - 8,
					opacity: 0.4,
				}}
			>
				{`${users.length} popens`}
				<FlexGrow />
				<a
					css={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						fontWeight: 800,
						opacity: 0.4,
					}}
					href="https://github.com/makidoll/baltimare-leaderboard"
				>
					source code
					<FaArrowRight size={16} style={{ marginLeft: 4 }} />
				</a>
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "column",
					gap: 4,
					width: "calc(100vw - 16px)",
					maxWidth: 800,
					marginBottom: 32,
				}}
			>
				{users.map((user, i) => (
					<User
						key={i}
						i={i}
						user={user}
						highestMinutes={highestMinutes}
					/>
				))}
			</div>
		</>
	);
}
