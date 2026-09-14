package ports

import (
	"context"

	"inlab/internal/domain"
)

type ECGDeviceRepository interface {
	UpsertLinkCode(ctx context.Context, c domain.ECGLinkCode) error
	FindLinkCode(ctx context.Context, code string) (domain.ECGLinkCode, error)
	DeleteLinkCode(ctx context.Context, id string) error
	CreateDevice(ctx context.Context, d domain.ECGDevice) (domain.ECGDevice, error)
	GetDeviceByID(ctx context.Context, id string) (domain.ECGDevice, error)
	GetDeviceByMAC(ctx context.Context, mac string) (domain.ECGDevice, error)
	GetDeviceByAgentTokenHash(ctx context.Context, hash string) (domain.ECGDevice, error)
	ListDevicesByUser(ctx context.Context, userID string) ([]domain.ECGDevice, error)
	TouchLastSeen(ctx context.Context, id string) error
	DeleteDevice(ctx context.Context, id, userID string) error
}
