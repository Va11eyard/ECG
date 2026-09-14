package domain

import "time"

type ECGDevice struct {
	ID             string
	UserID         string
	MAC            string
	Name           string
	AgentTokenHash string
	LastSeenAt     *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ECGLinkCode struct {
	ID        string
	UserID    string
	Code      string
	ExpiresAt time.Time
	CreatedAt time.Time
}
