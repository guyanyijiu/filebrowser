package http

import (
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var conns = make(map[uint]*websocket.Conn)
var connsLock = &sync.RWMutex{}

const (
	EventPlay   = 1
	EventPause  = 2
	EventSeeked = 3
)

type VideoEvent struct {
	E   int   `json:"e"`
	Ct  int64 `json:"ct"`
	Ts  int64 `json:"ts"`
	Uid uint  `json:"uid"`
}

var syncVideoHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	defer conn.Close()

	userId := d.user.ID

	connsLock.Lock()
	conns[userId] = conn
	connsLock.Unlock()

	for {
		msgType, msg, err := conn.ReadMessage()
		if err != nil {
			log.Printf("sync_video read conn err: %v, uid: %d", err, userId)
			connsLock.Lock()
			for id, c := range conns {
				c.Close()
				delete(conns, id)
			}
			connsLock.Unlock()
			return 0, nil
		}

		switch msgType {
		case websocket.TextMessage:
			if len(msg) > 0 {
				log.Printf("sync_video receive msg: %s, %s", d.user.Username, string(msg))
				// event := &VideoEvent{}
				// err := json.Unmarshal(msg, event)
				// if err != nil {
				// 	log.Printf("sync_video receive msg parse err: %v, msg: %s", err, string(msg))
				// }
				// event.Uid = int64(d.user.ID)

				connsLock.Lock()
				for id, c := range conns {
					if err := c.WriteMessage(websocket.TextMessage, msg); err != nil {
						log.Printf("sync_video write conn err: %v, uid: %d", err, id)
						c.Close()
						delete(conns, id)
					}
				}
				connsLock.Unlock()
			}
		case websocket.CloseMessage:
			log.Printf("sync_video receive close message, uid: %d", userId)
			connsLock.Lock()
			for id, c := range conns {
				c.Close()
				delete(conns, id)
			}
			connsLock.Unlock()
		}
	}
})
