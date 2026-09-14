package ecg

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"
	"time"

	compliance "github.com/Va11eyard/ai-complience-sdk/go"

	"inlab/internal/domain"
	"inlab/internal/usecase/ports"
)

var screenAudit = compliance.NewAuditLogger(nil)

type RhythmSummarizer interface {
	Summarize(ctx context.Context, v Vitals, locale string) (string, error)
}

type Service struct {
	Repo       ports.ECGDeviceRepository
	Summarizer RhythmSummarizer
}

type LinkOut struct {
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
}

type ClaimOut struct {
	DeviceID   string `json:"device_id"`
	MAC        string `json:"mac"`
	Name       string `json:"name"`
	AgentToken string `json:"agent_token"`
}

type DeviceDTO struct {
	ID         string     `json:"id"`
	MAC        string     `json:"mac"`
	Name       string     `json:"name"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

func (s *Service) CreateLinkCode(ctx context.Context, userID string) (LinkOut, error) {
	uid := strings.TrimSpace(userID)
	if uid == "" {
		return LinkOut{}, domain.ErrInvalidInput
	}
	code, err := randomDigits6()
	if err != nil {
		return LinkOut{}, err
	}
	exp := time.Now().UTC().Add(15 * time.Minute)
	if err := s.Repo.UpsertLinkCode(ctx, domain.ECGLinkCode{
		UserID:    uid,
		Code:      code,
		ExpiresAt: exp,
	}); err != nil {
		return LinkOut{}, err
	}
	return LinkOut{Code: code, ExpiresAt: exp}, nil
}

func (s *Service) Claim(ctx context.Context, code, mac, name string) (ClaimOut, error) {
	code = strings.TrimSpace(code)
	mac = normalizeMAC(mac)
	name = strings.TrimSpace(name)
	if code == "" || mac == "" {
		return ClaimOut{}, domain.ErrInvalidInput
	}
	link, err := s.Repo.FindLinkCode(ctx, code)
	if err != nil {
		return ClaimOut{}, err
	}
	if time.Now().UTC().After(link.ExpiresAt) {
		_ = s.Repo.DeleteLinkCode(ctx, link.ID)
		return ClaimOut{}, domain.ErrInvalidInput
	}
	out, err := s.bindDevice(ctx, link.UserID, mac, name)
	if err != nil {
		return ClaimOut{}, err
	}
	_ = s.Repo.DeleteLinkCode(ctx, link.ID)
	return out, nil
}

func (s *Service) Bind(ctx context.Context, userID, mac, name string) (ClaimOut, error) {
	uid := strings.TrimSpace(userID)
	mac = normalizeMAC(mac)
	name = strings.TrimSpace(name)
	if uid == "" || mac == "" {
		return ClaimOut{}, domain.ErrInvalidInput
	}
	return s.bindDevice(ctx, uid, mac, name)
}

func (s *Service) bindDevice(ctx context.Context, userID, mac, name string) (ClaimOut, error) {
	if existing, err := s.Repo.GetDeviceByMAC(ctx, mac); err == nil {
		if existing.UserID != userID {
			return ClaimOut{}, domain.ErrConflict
		}
		token, hash, err := newAgentToken()
		if err != nil {
			return ClaimOut{}, err
		}
		_ = s.Repo.DeleteDevice(ctx, existing.ID, existing.UserID)
		d, err := s.Repo.CreateDevice(ctx, domain.ECGDevice{
			UserID:         userID,
			MAC:            mac,
			Name:           firstNonEmpty(name, existing.Name, "AIECG"),
			AgentTokenHash: hash,
		})
		if err != nil {
			return ClaimOut{}, err
		}
		return ClaimOut{DeviceID: d.ID, MAC: d.MAC, Name: d.Name, AgentToken: token}, nil
	}
	token, hash, err := newAgentToken()
	if err != nil {
		return ClaimOut{}, err
	}
	if name == "" {
		name = "AIECG " + strings.ReplaceAll(mac, ":", "")
	}
	d, err := s.Repo.CreateDevice(ctx, domain.ECGDevice{
		UserID:         userID,
		MAC:            mac,
		Name:           name,
		AgentTokenHash: hash,
	})
	if err != nil {
		return ClaimOut{}, err
	}
	return ClaimOut{DeviceID: d.ID, MAC: d.MAC, Name: d.Name, AgentToken: token}, nil
}

func (s *Service) List(ctx context.Context, userID string) ([]DeviceDTO, error) {
	list, err := s.Repo.ListDevicesByUser(ctx, strings.TrimSpace(userID))
	if err != nil {
		return nil, err
	}
	out := make([]DeviceDTO, 0, len(list))
	for _, d := range list {
		out = append(out, DeviceDTO{
			ID: d.ID, MAC: d.MAC, Name: d.Name, LastSeenAt: d.LastSeenAt, CreatedAt: d.CreatedAt,
		})
	}
	return out, nil
}

func (s *Service) Unlink(ctx context.Context, userID, deviceID string) error {
	return s.Repo.DeleteDevice(ctx, strings.TrimSpace(deviceID), strings.TrimSpace(userID))
}

func (s *Service) AuthenticateAgent(ctx context.Context, rawToken string) (domain.ECGDevice, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return domain.ECGDevice{}, domain.ErrUnauthorized
	}
	sum := sha256.Sum256([]byte(rawToken))
	hash := hex.EncodeToString(sum[:])
	d, err := s.Repo.GetDeviceByAgentTokenHash(ctx, hash)
	if err != nil {
		return domain.ECGDevice{}, domain.ErrUnauthorized
	}
	_ = s.Repo.TouchLastSeen(ctx, d.ID)
	return d, nil
}

type ScreenInput struct {
	UserID    string
	DeviceID  string
	FsHz      float64
	SamplesMV []float64
	Locale    string
}

type ScreenOut struct {
	HeartRateBPM float64 `json:"heart_rate_bpm"`
	RhythmHint   string  `json:"rhythm_hint"`
	Quality      string  `json:"quality"`
	DurationSec  float64 `json:"duration_sec"`
	Summary      string  `json:"summary"`
	Disclaimer   string  `json:"disclaimer"`
}

func (s *Service) Screen(ctx context.Context, in ScreenInput) (ScreenOut, error) {
	if s == nil || s.Repo == nil {
		return ScreenOut{}, domain.ErrInternal
	}
	if _, err := s.GetOwned(ctx, in.UserID, in.DeviceID); err != nil {
		return ScreenOut{}, err
	}
	vitals, err := AnalyzeStrip(in.FsHz, in.SamplesMV)
	if err != nil {
		return ScreenOut{}, err
	}
	summary := sanitizeScreenText(DefaultScreenSummary(vitals, in.Locale))
	if s.Summarizer != nil {
		if t, err := s.Summarizer.Summarize(ctx, vitals, in.Locale); err == nil && strings.TrimSpace(t) != "" {
			summary = sanitizeScreenText(t)
		}
	}
	screenAudit.LogGeneration(ctx, compliance.GenerationEvent{
		Path:    "ecg.screen",
		Model:   "ecg-screen-v1",
		Success: true,
		Extra:   map[string]any{"rhythm": vitals.RhythmHint, "quality": vitals.Quality},
	})
	return ScreenOut{
		HeartRateBPM: vitals.HeartRateBPM,
		RhythmHint:   vitals.RhythmHint,
		Quality:      vitals.Quality,
		DurationSec:  round1(vitals.DurationSec),
		Summary:      summary,
		Disclaimer:   "This is not a medical diagnosis.",
	}, nil
}

func (s *Service) GetOwned(ctx context.Context, userID, deviceID string) (domain.ECGDevice, error) {
	d, err := s.Repo.GetDeviceByID(ctx, strings.TrimSpace(deviceID))
	if err != nil {
		return domain.ECGDevice{}, err
	}
	if d.UserID != strings.TrimSpace(userID) {
		return domain.ECGDevice{}, domain.ErrForbidden
	}
	return d, nil
}

func normalizeMAC(mac string) string {
	mac = strings.ToUpper(strings.TrimSpace(mac))
	mac = strings.ReplaceAll(mac, "-", ":")
	if !strings.Contains(mac, ":") && len(mac) == 12 {
		var b strings.Builder
		for i := 0; i < 12; i += 2 {
			if i > 0 {
				b.WriteByte(':')
			}
			b.WriteString(mac[i : i+2])
		}
		return b.String()
	}
	return mac
}

func newAgentToken() (raw, hash string, err error) {
	buf := make([]byte, 32)
	if _, err = rand.Read(buf); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(buf)
	sum := sha256.Sum256([]byte(raw))
	hash = hex.EncodeToString(sum[:])
	return raw, hash, nil
}

func randomDigits6() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
