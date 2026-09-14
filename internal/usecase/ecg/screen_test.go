package ecg

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"

	"inlab/internal/domain"
	"inlab/internal/usecase/ports"
)

func syntheticQRS(fs, bpm, seconds float64) []float64 {
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

func TestAnalyzeStrip_RegularRhythmHeartRate(t *testing.T) {
	const fs = 125.0
	samples := syntheticQRS(fs, 72, 20)
	v, err := AnalyzeStrip(fs, samples)
	if err != nil {
		t.Fatalf("AnalyzeStrip: %v", err)
	}
	if v.HeartRateBPM < 64 || v.HeartRateBPM > 80 {
		t.Fatalf("hr=%v want ~72", v.HeartRateBPM)
	}
	if v.Quality != "adequate" {
		t.Fatalf("quality=%q", v.Quality)
	}
	if v.RhythmHint != "regular" {
		t.Fatalf("rhythm=%q", v.RhythmHint)
	}
	if v.DurationSec < 19 {
		t.Fatalf("duration=%v", v.DurationSec)
	}
}

func TestAnalyzeStrip_IrregularRhythm(t *testing.T) {
	const fs = 125.0
	n := int(fs * 22)
	samples := make([]float64, n)
	t0 := 0.0
	rrs := []float64{0.48, 1.15, 0.5, 1.22, 0.45, 1.18, 0.52, 1.25, 0.47, 1.1, 0.5, 1.2, 0.44, 1.16, 0.51, 1.21, 0.49, 1.19, 0.46, 1.24}
	for _, rr := range rrs {
		idx := int((t0 + 0.02) * fs)
		for k := -4; k <= 4; k++ {
			j := idx + k
			if j < 0 || j >= n {
				continue
			}
			x := float64(k) / 2.2
			samples[j] += 1.5 * math.Exp(-x*x)
		}
		t0 += rr
	}
	v, err := AnalyzeStrip(fs, samples)
	if err != nil {
		t.Fatal(err)
	}
	if v.RhythmHint != "irregular" {
		t.Fatalf("rhythm=%q cv=%v", v.RhythmHint, v.RRVariation)
	}
}

func TestAnalyzeStrip_RejectsBadRate(t *testing.T) {
	samples := syntheticQRS(125, 70, 20)
	if _, err := AnalyzeStrip(10, samples); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("low fs err=%v", err)
	}
}

func TestDefaultScreenSummary_Locales(t *testing.T) {
	v := Vitals{HeartRateBPM: 70, RhythmHint: "irregular"}
	if !strings.Contains(DefaultScreenSummary(v, "en"), "irregular") {
		t.Fatal("en")
	}
	if !strings.Contains(DefaultScreenSummary(v, "ru"), "нерегулярным") {
		t.Fatal("ru")
	}
	if !strings.Contains(DefaultScreenSummary(v, "kz"), "үзік") {
		t.Fatal("kz")
	}
}

func TestSanitizeScreenText_EmptyBecomesDisclosure(t *testing.T) {
	got := sanitizeScreenText("STEMI")
	if !hasDisclosure(got) {
		t.Fatalf("%q", got)
	}
}

func TestScreen_NilRepoAndShortStrip(t *testing.T) {
	if _, err := (&Service{}).Screen(context.Background(), ScreenInput{}); !errors.Is(err, domain.ErrInternal) {
		t.Fatalf("nil repo err=%v", err)
	}
	svc := &Service{Repo: &fakeECGRepo{byID: map[string]domain.ECGDevice{
		"dev-1": {ID: "dev-1", UserID: "user-1"},
	}}}
	_, err := svc.Screen(context.Background(), ScreenInput{
		UserID: "user-1", DeviceID: "dev-1", FsHz: 125, SamplesMV: syntheticQRS(125, 70, 5),
	})
	if !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("short err=%v", err)
	}
}

func TestAnalyzeStrip_RejectsShortOrNoisy(t *testing.T) {
	short := syntheticQRS(125, 70, 5)
	if _, err := AnalyzeStrip(125, short); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("short strip err=%v", err)
	}
	noise := make([]float64, int(125*20))
	if _, err := AnalyzeStrip(125, noise); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("flat strip err=%v", err)
	}
}

func TestSanitizeScreenText_StripsTwelveLeadDiagnoses(t *testing.T) {
	got := sanitizeScreenText("Possible STEMI and left bundle branch block. Seek care.")
	low := strings.ToLower(got)
	if strings.Contains(low, "stemi") || strings.Contains(low, "bundle branch") {
		t.Fatalf("leaked diagnosis: %q", got)
	}
	if !strings.Contains(low, "not a medical diagnosis") && !strings.Contains(got, "не заменяет") {
		t.Fatalf("missing disclosure: %q", got)
	}
}

func TestScreen_OwnedDeviceHappyPath(t *testing.T) {
	svc := &Service{Repo: &fakeECGRepo{byID: map[string]domain.ECGDevice{
		"dev-1": {ID: "dev-1", UserID: "user-1", MAC: "90:26:05:06:F3:34", Name: "AIECG"},
	}}}
	out, err := svc.Screen(context.Background(), ScreenInput{
		UserID:    "user-1",
		DeviceID:  "dev-1",
		FsHz:      125,
		SamplesMV: syntheticQRS(125, 68, 22),
		Locale:    "en",
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.HeartRateBPM < 60 || out.Summary == "" {
		t.Fatalf("incomplete: %+v", out)
	}
	if !strings.Contains(strings.ToLower(out.Summary), "not a medical diagnosis") {
		t.Fatalf("summary missing disclosure: %q", out.Summary)
	}
	if strings.Contains(strings.ToLower(out.Summary), "stemi") {
		t.Fatal("summary named a 12-lead diagnosis")
	}
}

func TestScreen_ForbiddenDevice(t *testing.T) {
	svc := &Service{Repo: &fakeECGRepo{byID: map[string]domain.ECGDevice{
		"dev-1": {ID: "dev-1", UserID: "other", MAC: "AA:BB:CC:DD:EE:FF"},
	}}}
	_, err := svc.Screen(context.Background(), ScreenInput{
		UserID: "user-1", DeviceID: "dev-1", FsHz: 125, SamplesMV: syntheticQRS(125, 70, 20),
	})
	if !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("err=%v", err)
	}
}

func TestScreen_SummarizerCannotNameInfarction(t *testing.T) {
	svc := &Service{
		Repo: &fakeECGRepo{byID: map[string]domain.ECGDevice{
			"dev-1": {ID: "dev-1", UserID: "user-1"},
		}},
		Summarizer: stubSummarizer{text: "This is an anterior STEMI with infarction."},
	}
	out, err := svc.Screen(context.Background(), ScreenInput{
		UserID: "user-1", DeviceID: "dev-1", FsHz: 125, SamplesMV: syntheticQRS(125, 70, 20), Locale: "en",
	})
	if err != nil {
		t.Fatal(err)
	}
	low := strings.ToLower(out.Summary)
	if strings.Contains(low, "stemi") || strings.Contains(low, "infarction") {
		t.Fatalf("unsanitized: %q", out.Summary)
	}
}

type stubSummarizer struct{ text string }

func (s stubSummarizer) Summarize(_ context.Context, _ Vitals, _ string) (string, error) {
	return s.text, nil
}

type fakeECGRepo struct {
	byID map[string]domain.ECGDevice
}

func (f *fakeECGRepo) UpsertLinkCode(context.Context, domain.ECGLinkCode) error { return nil }
func (f *fakeECGRepo) FindLinkCode(context.Context, string) (domain.ECGLinkCode, error) {
	return domain.ECGLinkCode{}, domain.ErrNotFound
}
func (f *fakeECGRepo) DeleteLinkCode(context.Context, string) error { return nil }
func (f *fakeECGRepo) CreateDevice(context.Context, domain.ECGDevice) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (f *fakeECGRepo) GetDeviceByID(_ context.Context, id string) (domain.ECGDevice, error) {
	d, ok := f.byID[id]
	if !ok {
		return domain.ECGDevice{}, domain.ErrNotFound
	}
	return d, nil
}
func (f *fakeECGRepo) GetDeviceByMAC(context.Context, string) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (f *fakeECGRepo) GetDeviceByAgentTokenHash(context.Context, string) (domain.ECGDevice, error) {
	return domain.ECGDevice{}, domain.ErrNotFound
}
func (f *fakeECGRepo) ListDevicesByUser(context.Context, string) ([]domain.ECGDevice, error) {
	return nil, nil
}
func (f *fakeECGRepo) TouchLastSeen(context.Context, string) error { return nil }
func (f *fakeECGRepo) DeleteDevice(context.Context, string, string) error {
	return domain.ErrNotFound
}

var _ ports.ECGDeviceRepository = (*fakeECGRepo)(nil)
