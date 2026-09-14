package ecg

import (
	"regexp"
	"strings"
)

var twelveLeadDX = regexp.MustCompile(`(?i)n?stemi|infarction|bundle branch|hypertrophy|инфаркт|блокада ножки|ишеми`)

func DefaultScreenSummary(v Vitals, locale string) string {
	loc := strings.ToLower(strings.TrimSpace(locale))
	switch {
	case strings.HasPrefix(loc, "ru"):
		return ruSummary(v)
	case strings.HasPrefix(loc, "kk") || strings.HasPrefix(loc, "kz"):
		return kzSummary(v)
	default:
		return enSummary(v)
	}
}

func enSummary(v Vitals) string {
	rhythm := "regular"
	if v.RhythmHint == "irregular" {
		rhythm = "irregular"
	}
	return strings.TrimSpace(strings.Join([]string{
		sprintfHR("Heart rate looks about %.0f bpm on this single-lead strip.", v.HeartRateBPM),
		"Beat timing appears " + rhythm + ".",
		"This is not a medical diagnosis and is not a substitute for a clinician.",
	}, " "))
}

func ruSummary(v Vitals) string {
	rhythm := "регулярным"
	if v.RhythmHint == "irregular" {
		rhythm = "нерегулярным"
	}
	return strings.TrimSpace(strings.Join([]string{
		sprintfHR("ЧСС по одноканальной записи около %.0f уд/мин.", v.HeartRateBPM),
		"Ритм выглядит " + rhythm + ".",
		"Это не медицинский диагноз и не заменяет консультацию врача.",
	}, " "))
}

func kzSummary(v Vitals) string {
	rhythm := "үнемі"
	if v.RhythmHint == "irregular" {
		rhythm = "үзік"
	}
	return strings.TrimSpace(strings.Join([]string{
		sprintfHR("Бір арналы жазба бойынша жүрек соғысы шамамен %.0f рет/мин.", v.HeartRateBPM),
		"Ритм " + rhythm + " көрінеді.",
		"Бұл медициналық диагноз емес және дәрігер кеңесін алмастырмайды.",
	}, " "))
}

func sprintfHR(format string, hr float64) string {
	return strings.Replace(format, "%.0f", trimHR(hr), 1)
}

func trimHR(hr float64) string {
	n := int(hr + 0.5)
	if n < 0 {
		n = 0
	}
	return itoa(n)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}

func sanitizeScreenText(s string) string {
	out := strings.TrimSpace(twelveLeadDX.ReplaceAllString(s, ""))
	out = strings.Join(strings.Fields(out), " ")
	if out == "" || out == "." {
		out = DefaultScreenSummary(Vitals{HeartRateBPM: 0, RhythmHint: "regular"}, "en")
	}
	if !hasDisclosure(out) {
		out += " This is not a medical diagnosis."
	}
	return out
}

func hasDisclosure(s string) bool {
	low := strings.ToLower(s)
	return strings.Contains(low, "not a medical diagnosis") ||
		strings.Contains(s, "не заменяет") ||
		strings.Contains(s, "диагноз емес")
}
