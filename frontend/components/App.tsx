import Cron from "croner";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import type { IUser } from "../../server/users";
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
				<img src="baltimare-opg.png" className="logo"></img>
			</a>
			<div className="header">
				{`${users.length} popens`}

				<div className="flex-grow"></div>
				<a href="https://github.com/makidoll/baltimare-leaderboard">
					source code
					<FaArrowRight size={16} style={{ marginLeft: 4 }} />
				</a>
			</div>
			<div className="users">
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
