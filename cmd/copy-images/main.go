package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

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

type Pair struct {
	K, V []byte
}

func clone(src []byte) []byte {
	dst := make([]byte, len(src))
	copy(dst, src)
	return dst
}

func main() {
	if len(os.Args) < 3 {
		fmt.Println("usage: <src db path> <dest db path>")
		os.Exit(1)
	}

	db, err := bbolt.Open(os.Args[1], 0600, nil)
	if err != nil {
		panic(err)
	}

	var toCopy []Pair

	err = db.View(func(tx *bbolt.Tx) error {
		tx.Bucket([]byte("userImages")).ForEach(func(k, v []byte) error {
			toCopy = append(toCopy, Pair{K: clone(k), V: clone(v)})
			return nil
		})
		return nil
	})
	if err != nil {
		panic(err)
	}

	db.Close()

	fmt.Printf("found %d entries\n", len(toCopy))

	db, err = bbolt.Open(os.Args[2], 0600, nil)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bbolt.Tx) error {
		oldTotal := tx.Bucket([]byte("userImages")).Stats().KeyN
		fmt.Printf("will delete %d entries to replace, okay? (y/n) ", oldTotal)
		if !userConfirm() {
			fmt.Println("ok wont")
			return nil
		}

		err = tx.DeleteBucket([]byte("userImages"))
		if err != nil {
			return err
		}

		bucket, err := tx.CreateBucket([]byte("userImages"))
		if err != nil {
			return err
		}

		for i := range toCopy {
			err = bucket.Put(toCopy[i].K, toCopy[i].V)
			if err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		panic(err)
	}

	fmt.Println("successfully copied")
}
