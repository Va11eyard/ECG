package ecg

import (
	"math"

	"inlab/internal/domain"
)

const (
	minFsHz     = 50.0
	maxFsHz     = 500.0
	minStripSec = 8.0
	maxSamples  = 30000
	minPeaks    = 4
	minHR       = 35.0
	maxHR       = 200.0
	irregularCV = 0.15
)

type Vitals struct {
	HeartRateBPM float64
	RhythmHint   string
	Quality      string
	DurationSec  float64
	PeakCount    int
	RRVariation  float64
}

func AnalyzeStrip(fsHz float64, samples []float64) (Vitals, error) {
	if err := validateStrip(fsHz, samples); err != nil {
		return Vitals{}, err
	}
	peaks := rPeakIndexes(samples, fsHz)
	if len(peaks) < minPeaks {
		return Vitals{}, domain.ErrInvalidInput
	}
	hr, cv := rrStats(peaks, fsHz)
	if hr < minHR || hr > maxHR {
		return Vitals{}, domain.ErrInvalidInput
	}
	hint := "regular"
	if cv > irregularCV {
		hint = "irregular"
	}
	return Vitals{
		HeartRateBPM: round1(hr),
		RhythmHint:   hint,
		Quality:      "adequate",
		DurationSec:  float64(len(samples)) / fsHz,
		PeakCount:    len(peaks),
		RRVariation:  cv,
	}, nil
}

func validateStrip(fsHz float64, samples []float64) error {
	n := len(samples)
	if fsHz < minFsHz || fsHz > maxFsHz || n < 2 || n > maxSamples {
		return domain.ErrInvalidInput
	}
	if float64(n)/fsHz < minStripSec {
		return domain.ErrInvalidInput
	}
	return nil
}

func rPeakIndexes(samples []float64, fs float64) []int {
	env := energyEnvelope(samples, int(fs*0.08))
	thr := 0.35 * maxAbs(env)
	if thr <= 0 {
		return nil
	}
	refr := int(fs * 0.28)
	if refr < 8 {
		refr = 8
	}
	var peaks []int
	last := -refr
	for i, v := range env {
		if v < thr || i-last < refr {
			continue
		}
		peaks = append(peaks, i)
		last = i
	}
	return peaks
}

func energyEnvelope(samples []float64, win int) []float64 {
	if win < 3 {
		win = 3
	}
	n := len(samples)
	sq := make([]float64, n)
	for i := 1; i < n; i++ {
		d := samples[i] - samples[i-1]
		sq[i] = d * d
	}
	out := make([]float64, n)
	var acc float64
	for i := 0; i < n; i++ {
		acc += sq[i]
		if i >= win {
			acc -= sq[i-win]
		}
		out[i] = acc
	}
	return out
}

func maxAbs(v []float64) float64 {
	var m float64
	for _, x := range v {
		a := math.Abs(x)
		if a > m {
			m = a
		}
	}
	return m
}

func rrStats(peaks []int, fs float64) (hr, cv float64) {
	if len(peaks) < 2 || fs <= 0 {
		return 0, 0
	}
	span := float64(peaks[len(peaks)-1]-peaks[0]) / fs
	if span <= 0 {
		return 0, 0
	}
	hr = 60 * float64(len(peaks)-1) / span
	var sum, sumSq float64
	count := 0
	for i := 1; i < len(peaks); i++ {
		rr := float64(peaks[i]-peaks[i-1]) / fs
		if rr <= 0 {
			continue
		}
		sum += rr
		sumSq += rr * rr
		count++
	}
	if count < 2 {
		return hr, 0
	}
	mean := sum / float64(count)
	if mean <= 0 {
		return hr, 0
	}
	var_ := sumSq/float64(count) - mean*mean
	if var_ < 0 {
		var_ = 0
	}
	return hr, math.Sqrt(var_) / mean
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}
