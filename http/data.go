package http

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"git.hotmilk.space/maki/foxlib/foxcss"
	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
)

type renderData struct {
	ctx         context.Context
	users       []user.UserWithID
	onlineUsers map[string][]lsl.OnlineUser
	onlineUUIDs []uuid.UUID
}

func getRenderData(sortUsers bool, classPrefix string) (*renderData, error) {
	var err error
	data := &renderData{}

	data.users, err = user.GetUsers()
	if err != nil {
		slog.Error("failed to get users", "err", err)
		return data, errors.New("failed to get users")
	}

	if sortUsers {
		data.users, err = getSortedUsers(data.users)
		if err != nil {
			slog.Error("failed to sort users", "err", err)
			return data, errors.New("failed to sort users")
		}
	}

	data.onlineUsers = lsl.GetData()
	data.onlineUUIDs = lsl.GetOnlineUUIDs(data.onlineUsers)

	data.ctx = context.Background()
	data.ctx = foxcss.InitContext(data.ctx, classPrefix)

	err = foxcss.UseWords(
		data.ctx, foxcss.RegularWords, time.Now().Format(time.DateOnly),
	)
	if err != nil {
		slog.Error("failed to use css words", "err", err)
		return data, errors.New("failed to use css words")
	}

	return data, nil
}
