package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"inlab/internal/delivery/http/aicompliance"
	"inlab/internal/delivery/http/httpjson"
	"inlab/internal/delivery/http/httpx"
	ecguc "inlab/internal/usecase/ecg"
)

type screenBody struct {
	FsHz      float64   `json:"fs_hz"`
	SamplesMV []float64 `json:"samples_mv"`
	Locale    string    `json:"locale"`
}

const maxScreenSamples = 30000

func (h *ECG) Screen(c *gin.Context) {
	u, ok := httpx.User(c)
	if !ok || u == nil {
		httpjson.Fail(c, http.StatusUnauthorized, "UNAUTHORIZED", "unauthorized")
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
	var body screenBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpjson.Fail(c, http.StatusBadRequest, "INVALID_INPUT", "invalid body")
		return
	}
	if len(body.SamplesMV) == 0 || len(body.SamplesMV) > maxScreenSamples {
		httpjson.Fail(c, http.StatusBadRequest, "INVALID_INPUT", "invalid body")
		return
	}
	if h.Svc == nil {
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	out, err := h.Svc.Screen(c.Request.Context(), ecguc.ScreenInput{
		UserID:    u.ID,
		DeviceID:  strings.TrimSpace(c.Param("id")),
		FsHz:      body.FsHz,
		SamplesMV: body.SamplesMV,
		Locale:    body.Locale,
	})
	if err != nil {
		if httpjson.FromDomain(c, err) {
			return
		}
		httpjson.Fail(c, http.StatusInternalServerError, "INTERNAL", "internal error")
		return
	}
	httpjson.OK(c, http.StatusOK, aicompliance.MarkDiagnostic(out, "ecg-screen-v1"))
}
