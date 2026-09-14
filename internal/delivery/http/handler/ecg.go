package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	gorillaws "github.com/gorilla/websocket"

	"inlab/internal/delivery/http/httpjson"
	"inlab/internal/delivery/http/httpx"
	visitws "inlab/internal/delivery/ws"
	"inlab/internal/ecgws"
	ecguc "inlab/internal/usecase/ecg"
)

type ECG struct {
	Svc              *ecguc.Service
	Hub              *ecgws.Hub
	CORSAllowOrigins []string
}

func (h *ECG) CreateLink(c *gin.Context) {
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	out, err := h.Svc.CreateLinkCode(c.Request.Context(), u.ID)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, out)
}

func (h *ECG) ListDevices(c *gin.Context) {
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	list, err := h.Svc.List(c.Request.Context(), u.ID)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, gin.H{"devices": list})
}

func (h *ECG) Unlink(c *gin.Context) {
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	id := strings.TrimSpace(c.Param("id"))
	if err := h.Svc.Unlink(c.Request.Context(), u.ID, id); err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, gin.H{})
}

type claimBody struct {
	Code string `json:"code"`
	MAC  string `json:"mac"`
	Name string `json:"name"`
}

func (h *ECG) Claim(c *gin.Context) {
	var body claimBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpjson.Fail(c, http.StatusBadRequest, "INVALID_INPUT", "invalid body")
		return
	}
	out, err := h.Svc.Claim(c.Request.Context(), body.Code, body.MAC, body.Name)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, out)
}

type bindBody struct {
	MAC  string `json:"mac"`
	Name string `json:"name"`
}

func (h *ECG) Bind(c *gin.Context) {
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	var body bindBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpjson.Fail(c, http.StatusBadRequest, "INVALID_INPUT", "invalid body")
		return
	}
	out, err := h.Svc.Bind(c.Request.Context(), u.ID, body.MAC, body.Name)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, out)
}

type samplesBody struct {
	Type      string    `json:"type"`
	FsHz      float64   `json:"fs_hz"`
	SamplesMV []float64 `json:"samples_mv"`
	RawHex    string    `json:"raw_hex,omitempty"`
	Seq       uint64    `json:"seq,omitempty"`
}

func (h *ECG) IngestSamples(c *gin.Context) {
	tok := bearerToken(c)
	dev, err := h.Svc.AuthenticateAgent(c.Request.Context(), tok)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	var body samplesBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpjson.Fail(c, http.StatusBadRequest, "INVALID_INPUT", "invalid body")
		return
	}
	if body.Type == "" {
		body.Type = "samples"
	}
	payload, _ := json.Marshal(map[string]any{
		"type":       body.Type,
		"device_id":  dev.ID,
		"mac":        dev.MAC,
		"fs_hz":      body.FsHz,
		"samples_mv": body.SamplesMV,
		"raw_hex":    body.RawHex,
		"seq":        body.Seq,
	})
	if h.Hub != nil {
		h.Hub.Broadcast(dev.ID, payload)
	}
	httpjson.OK(c, http.StatusOK, gin.H{"viewers": 0})
}

func (h *ECG) AgentStatus(c *gin.Context) {
	tok := bearerToken(c)
	dev, err := h.Svc.AuthenticateAgent(c.Request.Context(), tok)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	b, _ := io.ReadAll(io.LimitReader(c.Request.Body, 4096))
	var body map[string]any
	_ = json.Unmarshal(b, &body)
	status, _ := body["status"].(string)
	if status == "" {
		status = "online"
	}
	payload, _ := json.Marshal(map[string]any{
		"type":      "device_status",
		"device_id": dev.ID,
		"mac":       dev.MAC,
		"status":    status,
	})
	if h.Hub != nil {
		h.Hub.Broadcast(dev.ID, payload)
	}
	httpjson.OK(c, http.StatusOK, gin.H{})
}

func (h *ECG) LiveWS(c *gin.Context) {
	if h.Hub == nil {
		httpjson.Fail(c, http.StatusServiceUnavailable, "WS_UNAVAILABLE", "ecg hub not configured")
		return
	}
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	id := strings.TrimSpace(c.Param("id"))
	dev, err := h.Svc.GetOwned(c.Request.Context(), u.ID, id)
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}

	upgrader := gorillaws.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 4096,
		CheckOrigin:     websocketCheckOrigin(h.CORSAllowOrigins),
	}
	raw, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	wsConn := visitws.NewConn()
	client := &ecgws.Client{UserID: u.ID, DeviceID: dev.ID, Conn: wsConn}
	h.Hub.Join(dev.ID, client)
	defer func() {
		h.Hub.Leave(dev.ID, client)
		wsConn.Close()
	}()

	hello, _ := json.Marshal(map[string]any{
		"type":      "hello",
		"device_id": dev.ID,
		"mac":       dev.MAC,
		"name":      dev.Name,
	})
	_ = wsConn.Enqueue(hello)

	go wsConn.WritePump(raw)
	wsConn.ReadPump(raw, func(_ []byte) bool { return true })
}

func bearerToken(c *gin.Context) string {
	h := strings.TrimSpace(c.GetHeader("Authorization"))
	if len(h) >= 7 && strings.EqualFold(h[:7], "Bearer ") {
		return strings.TrimSpace(h[7:])
	}
	return strings.TrimSpace(c.Query("token"))
}
