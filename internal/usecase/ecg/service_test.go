package ecg

import "testing"

func TestNormalizeMAC(t *testing.T) {
	cases := map[string]string{
		"90:26:05:06:F3:34": "90:26:05:06:F3:34",
		"90260506f334":      "90:26:05:06:F3:34",
		"90-26-05-06-f3-34": "90:26:05:06:F3:34",
	}
	for in, want := range cases {
		if got := normalizeMAC(in); got != want {
			t.Fatalf("normalizeMAC(%q)=%q want %q", in, got, want)
		}
	}
}

func TestNewAgentToken(t *testing.T) {
	raw, hash, err := newAgentToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(raw) != 64 || len(hash) != 64 {
		t.Fatalf("unexpected lengths raw=%d hash=%d", len(raw), len(hash))
	}
	if raw == hash {
		t.Fatal("token must not equal hash")
	}
}
