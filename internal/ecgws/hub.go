package ecgws

import (
	"sync"

	visitws "inlab/internal/delivery/ws"
)

type Client struct {
	UserID   string
	DeviceID string
	Conn     *visitws.Conn
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]map[*Client]struct{})}
}

func (h *Hub) Join(deviceID string, c *Client) {
	if deviceID == "" || c == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	m := h.rooms[deviceID]
	if m == nil {
		m = make(map[*Client]struct{})
		h.rooms[deviceID] = m
	}
	m[c] = struct{}{}
}

func (h *Hub) Leave(deviceID string, c *Client) {
	if deviceID == "" || c == nil {
		return
	}
	h.mu.Lock()
	if m, ok := h.rooms[deviceID]; ok {
		delete(m, c)
		if len(m) == 0 {
			delete(h.rooms, deviceID)
		}
	}
	h.mu.Unlock()
}

func (h *Hub) Broadcast(deviceID string, payload []byte) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	m := h.rooms[deviceID]
	if m == nil {
		return 0
	}
	n := 0
	for c := range m {
		if c.Conn.Enqueue(payload) {
			n++
		}
	}
	return n
}
