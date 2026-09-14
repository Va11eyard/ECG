# How this module is wired in InLab

These files live in mixed InLab packages, so they were not copied whole. Source: `E:\WebstormProjects\InLab`.

## API (`cmd/api/main.go`)

```go
import (
	"inlab/internal/ecgws"
	ecguc "inlab/internal/usecase/ecg"
)

ecgRepo := postgres.NewECGDeviceRepository(pool)
ecgSvc := &ecguc.Service{Repo: ecgRepo}
ecgHub := ecgws.NewHub()
ecgH := &handler.ECG{Svc: ecgSvc, Hub: ecgHub, CORSAllowOrigins: cfg.CORSAllowOrigins}

// httpserver.Options
ECG: ecgH,
```

## Routes (`internal/delivery/http/server.go`)

`Options` field: `ECG *handler.ECG`

```go
if opts.ECG != nil {
	protected.POST("/ecg/link", opts.ECG.CreateLink)
	protected.POST("/ecg/devices/bind", opts.ECG.Bind)
	protected.GET("/ecg/devices", opts.ECG.ListDevices)
	protected.DELETE("/ecg/devices/:id", opts.ECG.Unlink)
	protected.GET("/ecg/devices/:id/ws", opts.ECG.LiveWS)
	protected.POST("/ecg/devices/:id/screen", aiDisc, opts.ECG.Screen)
	api.POST("/ecg/claim", opts.ECG.Claim)
	api.POST("/ecg/agent/samples", opts.ECG.IngestSamples)
	api.POST("/ecg/agent/status", opts.ECG.AgentStatus)
}
```

## Frontend router (`web/src/app/router.tsx`)

```tsx
import { AppEcgPage } from "@/pages/app/ecg";
// inside /app routes:
{ path: "ecg", element: <AppEcgPage /> },
```

## Sidebar (`web/src/app/layout/AppSidebarNav.tsx`)

Import `HeartPulse` from lucide-react.

```tsx
<NavLink to={`/${lang}/app/ecg`} className={({ isActive }) => nav(isActive)}>
  <HeartPulse className={navIc} aria-hidden />
  {t("profile.navEcg")}
</NavLink>
```

Locale keys: merge `web/src/shared/lib/i18n/locales/{en,ru,kz}.json` (`ecg` + `profile.navEcg`) into InLab locale files.

## Shared InLab deps (not copied)

Go: `inlab/internal/domain` errors, `httpjson`/`httpx`/`aicompliance`, `internal/delivery/ws`, `postgres.mapError`, Gin, gorilla/websocket, `ai-complience-sdk`.

Web: `@/shared/api/client`, `@/shared/config/env`, i18n, Tailwind/UI used by the live view.
