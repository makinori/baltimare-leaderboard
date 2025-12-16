package lsl

import (
	"encoding/hex"
	"fmt"
	"log/slog"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/robfig/cron/v3"
)

// lsl script should update every 5 seconds
// will fail if http error code 500 more than 5 times in a minute
// script handles this and pauses sending for a minute

// online regions/users expire here after 15 seconds

const (
	ScriptIntervalSeconds = 5
	regionExpireSeconds   = 15
)

type OnlineUser struct {
	UUID uuid.UUID
	X, Y int
}

type OnlineRegion struct {
	Users   []OnlineUser
	Expires time.Time
}

var (
	// region name => OnlineRegion
	onlineRegions = sync.Map{}

	lineRegexp = regexp.MustCompile(`(?i)([0-9a-f]{32})(-?[0-9]+),(-?[0-9]+)`)
)

func PutData(region string, data string) {
	onlineRegion := OnlineRegion{
		Expires: time.Now().Add(time.Second * regionExpireSeconds),
	}

	data = strings.TrimSpace(data)

	for line := range strings.SplitSeq(data, ";") {
		matches := lineRegexp.FindStringSubmatch(line)
		if len(matches) == 0 {
			// invalid
			slog.Warn("invalid lsl", "line", line)
			continue
		}

		// cant fail cause regexp
		uuidBytes, _ := hex.DecodeString(matches[1])
		x, _ := strconv.Atoi(matches[2])
		y, _ := strconv.Atoi(matches[3])

		onlineRegion.Users = append(onlineRegion.Users, OnlineUser{
			UUID: uuid.UUID(uuidBytes),
			X:    x,
			Y:    y,
		})
	}

	onlineRegions.Store(region, onlineRegion)
}

func GetData() map[string][]OnlineUser {
	now := time.Now()
	data := map[string][]OnlineUser{}

	onlineRegions.Range(func(region, onlineRegion any) bool {
		if (onlineRegion.(OnlineRegion)).Expires.Before(now) {
			return true
		}
		data[region.(string)] = onlineRegion.(OnlineRegion).Users
		return true
	})

	return data
}

func GetOnlineUUIDs(data map[string][]OnlineUser) []uuid.UUID {
	var uuids []uuid.UUID

	for _, users := range data {
		for i := range users {
			if slices.Contains(uuids, users[i].UUID) {
				continue
			}
			uuids = append(uuids, users[i].UUID)
		}
	}

	return uuids
}

func GetHealth() (bool, map[string]bool) {
	allHealthy := true
	online := map[string]bool{}

	data := GetData()

	for _, region := range env.REGIONS {
		_, healthy := data[region]
		online[region] = healthy
		if !healthy {
			allHealthy = false
		}
	}

	return allHealthy, online
}

func reap() {
	now := time.Now()
	var toDelete []any

	onlineRegions.Range(func(region, onlineRegion any) bool {
		if (onlineRegion.(OnlineRegion)).Expires.Before(now) {
			toDelete = append(toDelete, region)
		}

		return true
	})

	if len(toDelete) == 0 {
		return
	}

	for i := range toDelete {
		onlineRegions.Delete(toDelete[i])
	}

	// do event emmitter update
}

func Init(cron *cron.Cron) {
	_, err := cron.AddFunc(
		fmt.Sprintf("*/%d * * * * *", regionExpireSeconds), reap,
	)

	if err != nil {
		panic(err)
	}

	slog.Info("started region expire cron")
}
