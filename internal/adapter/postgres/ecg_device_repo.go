package postgres

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"inlab/internal/adapter/postgres/queries"
	"inlab/internal/domain"
)

type ECGDeviceRepository struct {
	pool *pgxpool.Pool
}

func NewECGDeviceRepository(pool *pgxpool.Pool) *ECGDeviceRepository {
	return &ECGDeviceRepository{pool: pool}
}

func (r *ECGDeviceRepository) UpsertLinkCode(ctx context.Context, c domain.ECGLinkCode) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return mapError("ecg.UpsertLinkCode.begin", err)
	}
	defer deferRollback(ctx, tx)
	if _, err := tx.Exec(ctx, queries.ECGLinkDeleteForUser, c.UserID); err != nil {
		return mapError("ecg.UpsertLinkCode.delete", err)
	}
	row := tx.QueryRow(ctx, queries.ECGLinkInsert, c.UserID, c.Code, c.ExpiresAt)
	if _, err := scanECGLinkRow(row); err != nil {
		return mapError("ecg.UpsertLinkCode.insert", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return mapError("ecg.UpsertLinkCode.commit", err)
	}
	return nil
}

func (r *ECGDeviceRepository) FindLinkCode(ctx context.Context, code string) (domain.ECGLinkCode, error) {
	row := r.pool.QueryRow(ctx, queries.ECGLinkSelectByCode, code)
	c, err := scanECGLinkRow(row)
	if err != nil {
		return domain.ECGLinkCode{}, mapError("ecg.FindLinkCode", err)
	}
	return c, nil
}

func (r *ECGDeviceRepository) DeleteLinkCode(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, queries.ECGLinkDeleteByID, id)
	if err != nil {
		return mapError("ecg.DeleteLinkCode", err)
	}
	if tag.RowsAffected() == 0 {
		return mapError("ecg.DeleteLinkCode", pgx.ErrNoRows)
	}
	return nil
}

func (r *ECGDeviceRepository) CreateDevice(ctx context.Context, d domain.ECGDevice) (domain.ECGDevice, error) {
	row := r.pool.QueryRow(ctx, queries.ECGDeviceInsert, d.UserID, d.MAC, d.Name, d.AgentTokenHash)
	out, err := scanECGDeviceRow(row)
	if err != nil {
		return domain.ECGDevice{}, mapError("ecg.CreateDevice", err)
	}
	return out, nil
}

func (r *ECGDeviceRepository) GetDeviceByID(ctx context.Context, id string) (domain.ECGDevice, error) {
	row := r.pool.QueryRow(ctx, queries.ECGDeviceSelectByID, id)
	out, err := scanECGDeviceRow(row)
	if err != nil {
		return domain.ECGDevice{}, mapError("ecg.GetDeviceByID", err)
	}
	return out, nil
}

func (r *ECGDeviceRepository) GetDeviceByMAC(ctx context.Context, mac string) (domain.ECGDevice, error) {
	row := r.pool.QueryRow(ctx, queries.ECGDeviceSelectByMAC, mac)
	out, err := scanECGDeviceRow(row)
	if err != nil {
		return domain.ECGDevice{}, mapError("ecg.GetDeviceByMAC", err)
	}
	return out, nil
}

func (r *ECGDeviceRepository) GetDeviceByAgentTokenHash(ctx context.Context, hash string) (domain.ECGDevice, error) {
	row := r.pool.QueryRow(ctx, queries.ECGDeviceSelectByTokenHash, hash)
	out, err := scanECGDeviceRow(row)
	if err != nil {
		return domain.ECGDevice{}, mapError("ecg.GetDeviceByAgentTokenHash", err)
	}
	return out, nil
}

func (r *ECGDeviceRepository) ListDevicesByUser(ctx context.Context, userID string) ([]domain.ECGDevice, error) {
	rows, err := r.pool.Query(ctx, queries.ECGDeviceListByUser, userID)
	if err != nil {
		return nil, mapError("ecg.ListDevicesByUser", err)
	}
	defer rows.Close()
	var out []domain.ECGDevice
	for rows.Next() {
		d, err := scanECGDeviceRow(rows)
		if err != nil {
			return nil, mapError("ecg.ListDevicesByUser.scan", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *ECGDeviceRepository) TouchLastSeen(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, queries.ECGDeviceTouch, id)
	if err != nil {
		return mapError("ecg.TouchLastSeen", err)
	}
	return nil
}

func (r *ECGDeviceRepository) DeleteDevice(ctx context.Context, id, userID string) error {
	tag, err := r.pool.Exec(ctx, queries.ECGDeviceDelete, id, userID)
	if err != nil {
		return mapError("ecg.DeleteDevice", err)
	}
	if tag.RowsAffected() == 0 {
		return mapError("ecg.DeleteDevice", pgx.ErrNoRows)
	}
	return nil
}

func scanECGLinkRow(row pgx.Row) (domain.ECGLinkCode, error) {
	var c domain.ECGLinkCode
	err := row.Scan(&c.ID, &c.UserID, &c.Code, &c.ExpiresAt, &c.CreatedAt)
	return c, err
}

func scanECGDeviceRow(row interface {
	Scan(dest ...any) error
}) (domain.ECGDevice, error) {
	var d domain.ECGDevice
	var lastSeen *time.Time
	err := row.Scan(&d.ID, &d.UserID, &d.MAC, &d.Name, &d.AgentTokenHash, &lastSeen, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return domain.ECGDevice{}, err
	}
	d.LastSeenAt = lastSeen
	return d, nil
}
