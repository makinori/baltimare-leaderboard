package main

import (
	"bufio"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"

	"github.com/google/uuid"
	"go.etcd.io/bbolt"
)

func userConfirm() bool {
	reader := bufio.NewReader(os.Stdin)
	input, err := reader.ReadString('\n')
	if err != nil {
		panic(err)
	}
	return strings.TrimSpace(input) == "y"
}

func cleanupImages(tx *bbolt.Tx) error {
	userImagesBucket := tx.Bucket([]byte("userImages"))
	if userImagesBucket == nil {
		return errors.New("userImages bucket missing")
	}

	var toDelete [][]byte
	alreadyMarked := func(a []byte) bool {
		for _, b := range toDelete {
			if slices.Compare(a, b) == 0 {
				return true
			}
		}
		return false
	}

	c := userImagesBucket.Cursor()
	for k, v := c.First(); k != nil; k, v = c.Next() {
		if alreadyMarked(k) {
			continue
		}

		keyLen := len(k)
		valLen := len(v)

		// <user id>
		if keyLen == 16 {
			if valLen != 0 {
				continue
			}

			fmt.Println("found empty image")
			fmt.Println("> user id:", uuid.UUID(k))
			fmt.Println("> image len:", valLen)

			toDelete = append(toDelete,
				slices.Concat(k),
				slices.Concat(k, []byte(":id")),
			)

			continue
		}

		// <user id>:id
		if slices.Compare(k[keyLen-3:], []byte(":id")) == 0 {
			imageID := uuid.UUID(v)
			if imageID != uuid.Nil {
				continue
			}

			userID := uuid.UUID(k[:keyLen-3])

			fmt.Println("found nil image id")
			fmt.Println("> user id:", userID)
			fmt.Println("> image id:", imageID)

			toDelete = append(toDelete,
				slices.Concat(userID[:]),
				slices.Concat(k),
			)

			continue
		}

		return errors.New("wtf is this key: " + hex.EncodeToString(k))
	}

	if len(toDelete) == 0 {
		fmt.Println("checked and nothing to delete")
		return nil
	}

	fmt.Println("keys to delete:")
	for _, key := range toDelete {
		fmt.Println("> " + hex.EncodeToString(key))
	}

	fmt.Printf("will delete %d keys, okay? (y/n) ", len(toDelete))
	if !userConfirm() {
		fmt.Println("ok wont")
		return nil
	}

	for _, key := range toDelete {
		err := userImagesBucket.Delete(key)
		if err != nil {
			return err
		}
	}

	fmt.Println("ok done")

	return nil
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("usage: <db path>")
		os.Exit(1)
	}

	db, err := bbolt.Open(os.Args[1], 0600, nil)
	if err != nil {
		panic(err)
	}

	// db.View(func(tx *bbolt.Tx) error {
	// 	tx.Bucket([]byte("userImages")).ForEach(func(k, v []byte) error {
	// 		fmt.Println(len(v), "\t", hex.EncodeToString(k))
	// 		return nil
	// 	})
	// 	return nil
	// })

	err = db.Update(cleanupImages)
	if err != nil {
		panic(err)
	}
}
