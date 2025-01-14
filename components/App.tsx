/** @jsxImportSource @emotion/react */
"use client";

import Pako from "pako";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconType } from "react-icons";
import {
	FaFilter,
	FaGithub,
	FaRegCircle,
	FaRegCircleDot,
	FaRobot,
	FaSort,
	FaUmbrellaBeach,
} from "react-icons/fa6";
import io, { Socket } from "socket.io-client";
import { IAppInitialData } from "../app/page";
import {
	type IApiOnlineSims,
	type IApiOnlineUser,
	type IApiUser,
} from "../server/managers/api-manager";
import { addSeperators, formatMinutes, isTourist } from "../shared/utils";
import { CLOUDSDALE } from "../shared/utils";
import { FlexGrow } from "./FlexGrow";
import { HStack, VStack } from "./Stack";
import { User } from "./User";
import { UsersMap } from "./UsersMap";
import { OnionIcon } from "./icons/OnionIcon";
import { useSoundManager } from "./services/SoundManager";

enum UsersFilter {
	ShowAll = "show all",
	Online = "online",
	Offline = "offline",
}

enum UsersSort {
	TotalTime = "total time",
	SinceOnline = "since online",
}

/*
function HeaderToggleButton(props: {
	onClick: (value: boolean) => any;
	icon: IconType;
	text: string;
	value: boolean;
}) {
	return (
		<HStack
			css={{
				// marginLeft: 24,
				marginLeft: 20,
				background: props.value ? "#666" : "transparent",
				color: props.value ? "#222" : "#666",
				borderRadius: 4,
				padding: "0 4px",
				// border: "solid 2px #666",
			}}
			onClick={() => {
				props.onClick(!props.value);
			}}
		>
			<props.icon size={16} css={{ marginLeft: 0 }} />
			<span
				css={{
					fontWeight: 800,
					marginLeft: 4,
					fontSize: 16,
					cursor: "pointer",
					userSelect: "none",
				}}
			>
				{props.text}
			</span>
		</HStack>
	);
}
*/

function HeaderOptionPicker(props: {
	icon: IconType;
	text: string;
	values: string[];
	value: string;
	onClick: (value: string) => any;
}) {
	return (
		<VStack
			css={{
				alignItems: "flex-start",
				fontWeight: 700,
				fontSize: 16,
				userSelect: "none",
				opacity: 0.8,
			}}
		>
			<HStack css={{ fontWeight: 900, marginBottom: 4 }}>
				<props.icon size={16} css={{ marginRight: 4 }} />
				{props.text}
			</HStack>
			{props.values.map((value, i) => (
				<HStack
					key={i}
					onClick={() => {
						props.onClick(value);
					}}
					css={{
						opacity: value == props.value ? 0.75 : 0.5,
						cursor: "pointer",
					}}
				>
					{props.value == value ? (
						<FaRegCircleDot size={16} css={{ marginRight: 4 }} />
					) : (
						<FaRegCircle size={16} css={{ marginRight: 4 }} />
					)}
					{value}
				</HStack>
			))}
		</VStack>
	);
}

export function App(props: { initial: IAppInitialData }) {
	const soundManager = useSoundManager();

	// will only run on client
	useEffect(() => {
		soundManager.init();
	}, [soundManager]);

	const [users, setUsers] = useState<IApiUser[]>(props.initial.users);
	const [onlineUsers, setOnlineUsers] = useState<IApiOnlineUser[]>(
		props.initial.online,
	);

	const [usersFilter, setUsersFilter] = useState(UsersFilter.ShowAll);
	const [usersSort, setUsersSort] = useState(UsersSort.TotalTime);
	const [showTourists, setShowTourists] = useState(false);
	const [showBots, setShowBots] = useState(false);

	const [totalSeenWithFilter, setTotalSeenWithFilter] = useState(0);
	const [totalMinutesWithFilter, setTotalMinutesWithFilter] = useState(0);

	const [health, setHealth] = useState<IApiOnlineSims>(props.initial.health);

	// const updateUsers = useCallback(async () => {
	// 	try {
	// 		const res = await fetch("/api/users");
	// 		setUsers(await res.json());
	// 	} catch (error) {}
	// }, [setUsers]);

	// never deinit cause this is the root component
	const socket = useRef<Socket>(null);

	useEffect(() => {
		/*
		// updateUsers(); // ssr has initial data
		// every minute, 15 seconds in
		const job = new Cron("15 * * * * *", updateUsers);
		return () => {
			job.stop();
		};
		*/

		socket.current = io({
			autoConnect: true,
			secure: window.location.protocol.includes("https"),
		});

		return () => {
			socket.current.disconnect();
		};
	}, [socket]);

	useEffect(() => {
		const onUsers = (data: ArrayBuffer) => {
			try {
				setUsers(JSON.parse(Pako.ungzip(data, { to: "string" })));
			} catch (error) {
				console.error(error);
			}
		};

		const onOnlineUsers = (data: ArrayBuffer) => {
			try {
				setOnlineUsers(JSON.parse(Pako.ungzip(data, { to: "string" })));
			} catch (error) {
				console.error(error);
			}
		};

		const onHealth = (data: any) => {
			try {
				setHealth(data);
			} catch (error) {
				console.error(error);
			}
		};

		socket.current.on("users", onUsers);
		socket.current.on("online", onOnlineUsers);
		socket.current.on("health", onHealth);

		return () => {
			socket.current.off("users", onUsers);
			socket.current.off("online", onOnlineUsers);
			socket.current.off("health", onHealth);
		};
	}, [setUsers, setOnlineUsers, setHealth]);

	const onlineUuids = useMemo(() => {
		return onlineUsers.map(u => u._id);
	}, [onlineUsers]);

	const shownUsers = useMemo(() => {
		let outputUsers: IApiUser[] = JSON.parse(JSON.stringify(users)); // deep copy

		if (!showBots) {
			outputUsers = outputUsers.filter(u => !u.traits.includes("bot"));
		}

		if (!CLOUDSDALE && !showTourists) {
			outputUsers = outputUsers.filter(u => !isTourist(u.minutes));
		}

		setTotalSeenWithFilter(outputUsers.length);

		let totalMinutes = 0;
		for (const user of outputUsers) {
			totalMinutes += user.minutes;
		}

		setTotalMinutesWithFilter(totalMinutes);

		switch (usersFilter) {
			case UsersFilter.Online:
				outputUsers = outputUsers.filter(u =>
					onlineUuids.includes(u._id),
				);
				break;
			case UsersFilter.Offline:
				outputUsers = outputUsers.filter(
					u => !onlineUuids.includes(u._id),
				);
				break;
		}

		// api should already have sorted it
		// outputUsers = outputUsers.sort((a, b) => b.minutes - a.minutes);

		if (usersSort == UsersSort.SinceOnline) {
			outputUsers = outputUsers.sort((a, b) =>
				onlineUuids.includes(a._id) && onlineUuids.includes(b._id)
					? 0
					: new Date(b.lastSeen).getTime() -
					  new Date(a.lastSeen).getTime(),
			);
		}

		return outputUsers;
	}, [
		users,
		onlineUuids,
		showBots,
		showTourists,
		usersFilter,
		usersSort,
		setTotalSeenWithFilter,
		setTotalMinutesWithFilter,
	]);

	const { highestMinutes, totalOnline } = useMemo(() => {
		let highestMinutes = 0;
		let totalOnline = 0;

		for (const user of shownUsers) {
			if (onlineUuids.includes(user._id)) totalOnline++;
			if (user.minutes > highestMinutes) {
				highestMinutes = user.minutes;
			}
		}

		return { highestMinutes, totalOnline };
	}, [shownUsers, onlineUuids]);

	const statusRightNow = useMemo(() => {
		if (usersFilter == UsersFilter.Offline) {
			return addSeperators(shownUsers.length) + " offline";
		} else {
			return addSeperators(totalOnline) + " online";
		}
	}, [usersFilter, shownUsers, totalOnline]);

	const seenInTotal = useMemo(() => {
		let others: string[] = [];
		if (showBots) others.push("bots");
		if (!CLOUDSDALE && showTourists) others.push("tourists");

		let secondary = "";
		if (others.length >= 2) {
			secondary = ", " + others.join(" and ");
		} else if (others.length == 1) {
			secondary = " and " + others[0];
		} else {
			secondary = " ";
		}

		return [addSeperators(totalSeenWithFilter) + " popens", secondary];
	}, [totalSeenWithFilter, showBots, showTourists]);

	const green = "rgb(139, 195, 74)"; // green 500
	const greenDim = "rgba(139, 195, 74, 0.6)"; // green 500

	const lime = "rgb(205, 220, 57)"; // lime 500
	const limeDim = "rgba(205, 220, 57, 0.6)"; // lime 500

	const mapWidth = 700;

	return (
		<HStack
			css={{
				display: "flex",
				width: "100%",
			}}
		>
			<VStack
				css={{
					width: "calc(100vw - 32px)",
					maxWidth: 800,
				}}
			>
				{CLOUDSDALE ? (
					<VStack
						css={{
							marginTop: 48,
							marginBottom: 48,
						}}
					>
						<h1
							css={{
								fontSize: 96,
								fontWeight: 300,
								letterSpacing: -4,
								margin: 0,
							}}
						>
							cloudsdale
						</h1>
						<a href="https://baltimare.hotmilk.space">
							<h1
								css={{
									fontSize: 32,
									fontWeight: 400,
									letterSpacing: -1,
									margin: 0,
									marginTop: -12,
								}}
							>
								next to baltimare lmao
							</h1>
						</a>
					</VStack>
				) : (
					<a href="https://baltimare.org">
						<img
							css={{
								width: 600,
								maxWidth: "100%",
								marginTop: 32,
								marginBottom: 16,
							}}
							src="baltimare-opg.png"
						></img>
					</a>
				)}
				<HStack
					css={{
						marginBottom: 4,
						width: mapWidth,
						maxWidth: "100%",
						justifyContent: "flex-end",
						alignItems: "flex-end",
						alignSelf: "flex-start",
					}}
				>
					<VStack css={{ alignItems: "flex-start" }}>
						{/* <div
							css={{
								opacity: 0.8,
								fontSize: 20,
								fontWeight: 800,
							}}
						>
							{`${shownUsers.length} popens seen`}
							{showTourists ? (
								<span css={{ opacity: 0.4, fontSize: 16 }}>
									{" "}
									and tourists
								</span>
							) : (
								<></>
							)}
						</div> */}
						<div
							css={{
								fontSize: 16,
								marginTop: 0,
								fontWeight: 700,
								color: greenDim,
							}}
						>
							&gt;{" "}
							<span css={{ color: green }}>{statusRightNow}</span>{" "}
							right now
							<br />
							&gt;{" "}
							<span css={{ color: green }}>{seenInTotal[0]}</span>
							{seenInTotal[1]} seen in total
							<br />
							&gt;{" "}
							<span css={{ color: green }}>
								{formatMinutes(totalMinutesWithFilter)}
							</span>{" "}
							collectively
						</div>
						<div
							css={{
								fontSize: 16,
								marginTop: 8,
								fontWeight: 700,
								color: limeDim,
							}}
						>
							&gt; total time online since{" "}
							<span css={{ color: lime }}>
								{CLOUDSDALE
									? "january 13th 2025"
									: "august 6th 2024"}
							</span>
							<br />
							&gt; also how long ago since last online
						</div>
						<HStack
							css={{
								gap: 32,
								width: "100%",
								alignItems: "flex-start",
								justifyContent: "flex-start",
								marginTop: 16,
								marginBottom: 12,
							}}
						>
							<HeaderOptionPicker
								text="filter"
								icon={FaFilter}
								values={Object.values(UsersFilter)}
								value={usersFilter}
								onClick={v => {
									setUsersFilter(v as UsersFilter);
								}}
							/>
							<HeaderOptionPicker
								text="sort"
								icon={FaSort}
								values={Object.values(UsersSort)}
								value={usersSort}
								onClick={v => {
									setUsersSort(v as UsersSort);
								}}
							/>
							<HeaderOptionPicker
								text="bots"
								icon={FaRobot}
								values={["hide", "show"]}
								value={showBots ? "show" : "hide"}
								onClick={v => {
									setShowBots(v == "show");
								}}
							/>
							{CLOUDSDALE ? (
								<></>
							) : (
								<HeaderOptionPicker
									text="tourists"
									icon={FaUmbrellaBeach}
									values={["hide", "show"]}
									value={showTourists ? "show" : "hide"}
									onClick={v => {
										setShowTourists(v == "show");
									}}
								/>
							)}
						</HStack>
					</VStack>
					<FlexGrow />
					<a
						css={{
							opacity: 0.4,
							marginRight: 4,
						}}
						href="https://github.com/makidoll/baltimare-leaderboard"
					>
						<FaGithub size={20} />
					</a>
					<a
						css={{
							opacity: 0.4,
							// marginRight: 80,
						}}
						href={`http://${
							CLOUDSDALE ? "cloudsdale" : "baltimare"
						}.hotmilkdyzrzsig55s373ruuedebeexwcgbipaemyjqnhd5wfmngjvqd.onion`}
					>
						<OnionIcon size={28} color="white" />
					</a>
					{/* <div css={{ width: 128 }}></div> */}
				</HStack>
				<UsersMap
					users={users}
					onlineUsers={onlineUsers}
					health={health}
					css={{
						marginBottom: 16,
						maxWidth: mapWidth,
						width: "100%",
						alignSelf: "flex-start",
					}}
				/>
				<div
					css={{
						display: "flex",
						flexDirection: "column",
						gap: 4,
						width: "100%",
					}}
				>
					{shownUsers.map((user, i) => (
						<User
							key={i}
							i={i}
							user={user}
							highestMinutes={highestMinutes}
							onlineUuids={onlineUuids}
						/>
					))}
				</div>
				<div
					css={{
						marginTop: 16,
						marginBottom: 128,
						fontWeight: 700,
						opacity: 0.4,
					}}
				>
					there might be some users outside of{" "}
					{CLOUDSDALE ? "cloudsdale" : "baltimare"} that accidentally
					got logged
				</div>
				{/* <div
					css={{
						marginTop: 16,
						marginBottom: 128,
						fontWeight: 800,
						opacity: 0.4,
					}}
				>
					total hours since august 6th 2024
				</div> */}
			</VStack>
		</HStack>
	);
}
