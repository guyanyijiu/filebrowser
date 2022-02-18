package http

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var conns = make(map[uint]*websocket.Conn)
var connsLock = &sync.RWMutex{}

const (
	EventPlay        = 1
	EventPause       = 2
	EventSeeked      = 3
	EventJoin        = 4
	EventUserOffline = 9
)

type VideoEvent struct {
	E   int   `json:"e"`
	Vt  int64 `json:"vt"`  // 视频当前播放时间
	Et  int64 `json:"et"`  // 事件触发事件
	Uid uint  `json:"uid"` // 事件触发用户ID
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
			delete(conns, userId)
			evt := &VideoEvent{
				E:   EventUserOffline,
				Vt:  0,
				Et:  time.Now().UnixMilli(),
				Uid: userId,
			}
			evtMsg, _ := json.Marshal(evt)
			for id, c := range conns {
				if err := c.WriteMessage(websocket.TextMessage, evtMsg); err != nil {
					c.Close()
					delete(conns, id)
				}
			}
			connsLock.Unlock()
			return 0, nil
		}

		switch msgType {
		case websocket.TextMessage:
			if len(msg) > 0 {
				log.Printf("sync_video receive msg: %s, %s", d.user.Username, string(msg))
				event := &VideoEvent{}
				if err := json.Unmarshal(msg, event); err != nil {
					log.Printf("sync_video msg unmarshal err: %v, msg: %s", err, string(msg))
					continue
				}

				connsLock.Lock()
				for id, c := range conns {
					if id == event.Uid {
						continue
					}
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
