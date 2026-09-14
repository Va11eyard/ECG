package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"inlab/internal/delivery/http/httpx"
	"inlab/internal/domain"
	ecguc "inlab/internal/usecase/ecg"
)

func qrs(fs, bpm, seconds float64) []float64 {
	n := int(fs * seconds)
	out := make([]float64, n)
	rr := 60.0 / bpm
	for i := 0; i < n; i++ {
		t := float64(i) / fs
		v := 0.04 * math.Sin(2*math.Pi*1.1*t)
		phase := math.Mod(t, rr)
		if phase < 0.05 {
			x := (phase - 0.02) / 0.007
			v += 1.4 * math.Exp(-x*x)
		}
		out[i] = v
	}
	return out
}

func TestECGScreen_ForbiddenAndShort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &ECG{Svc: &ecguc.Service{Repo: &screenRepo{owner: "other"}}}
	body, _ := json.Marshal(map[string]any{"fs_hz": 125, "samples_mv": qrs(125, 70, 20)})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/ecg/devices/dev-1/screen", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "dev-1"}}
	httpx.SetUser(c, &domain.User{ID: "user-1"})
	h.Screen(c)
	if w.Code != http.StatusForbidden {
		t.Fatalf("forbidden status=%d body=%s", w.Code, w.Body.String())
	}

	h = &ECG{Svc: &ecguc.Service{Repo: &screenRepo{owner: "user-1"}}}
	short, _ := json.Marshal(map[string]any{"fs_hz": 125, "samples_mv": qrs(125, 70, 4)})
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/ecg/devices/dev-1/screen", bytes.NewReader(short))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "dev-1"}}
	httpx.SetUser(c, &domain.User{ID: "user-1"})
	h.Screen(c)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("short status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestECGScreen_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &ECG{Svc: &ecguc.Service{}}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/ecg/devices/dev-1/screen", bytes.NewBufferString(`{}`))
	c.Params = gin.Params{{Key: "id", Value: "dev-1"}}
	h.Screen(c)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestECGScreen_HappyPathMarked(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &ECG{Svc: &ecguc.Service{Repo: &screenRepo{owner: "user-1"}}}
	body, _ := json.Marshal(map[string]any{"fs_hz": 125, "samples_mv": qrs(125, 70, 20), "locale": "en"})
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/ecg/devices/dev-1/screen", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "dev-1"}}
	httpx.SetUser(c, &domain.User{ID: "user-1"})
	h.Screen(c)
	if w.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	raw := w.Body.String()
	if !strings.Contains(raw, `"ai_generated"`) || !strings.Contains(raw, `_ai_provenance`) {
		t.Fatalf("missing provenance: %s", raw)
	}
	if !strings.Contains(strings.ToLower(raw), "not a medical diagnosis") && !strings.Contains(raw, "не заменяет") {
		t.Fatalf("missing disclosure: %s", raw)
	}
	if strings.Contains(strings.ToLower(raw), "stemi") {
		t.Fatalf("named 12-lead dx: %s", raw)
	}
}

type screenRepo struct{ owner string }

func (s *screenRepo) UpsertLinkCode(context.Context, domain.ECGLinkCode) error { return nil }
func (s *screenRepo) FindLinkCode(context.Context, string) (domain.ECGLinkCode, error) {
	return domain.ECGLinkCode{}, domain.ErrNotFound
}
func (s *screenRepo) DeleteLinkCode(context.Context, string) error { return nil }
func (s *screenRepo) CreateDevice(context.Context, domain.ECGDevice) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (s *screenRepo) GetDeviceByID(_ context.Context, id string) (domain.ECGDevice, error) {
	return domain.ECGDevice{ID: id, UserID: s.owner}, nil
}
func (s *screenRepo) GetDeviceByMAC(context.Context, string) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (s *screenRepo) GetDeviceByAgentTokenHash(context.Context, string) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (s *screenRepo) ListDevicesByUser(context.Context, string) ([]domain.ECGDevice, error) {
	return nil, nil
}
func (s *screenRepo) TouchLastSeen(context.Context, string) error { return nil }
func (s *screenRepo) DeleteDevice(context.Context, string, string) error {
	return domain.ErrNotFound
}
