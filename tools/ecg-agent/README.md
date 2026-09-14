
Links the portable **AIECG** ECG (问心无恙) to InLab over Bluetooth and streams live samples.

## Preferred: browser (Web Bluetooth)

1. Open InLab in **Chrome or Edge** → **ECG device** (`/app/ecg`)
2. Power on the AIECG
3. Click **Connect ECG** and pick the device once
4. Status shows connected; later visits try to reconnect automatically

No Python agent is required for this path.

## Optional: desktop agent

Use this when Web Bluetooth is unavailable (e.g. Firefox, or a separate PC near the device).

### Prerequisites

- Windows laptop with Bluetooth
- Powered-on AIECG advertising as `AIECG …`
- InLab API running (with migration `055_ecg_devices.sql` applied)
- Python 3.10+

```bash
pip install bleak requests
```

### Flow

1. Sign in to InLab → **ECG device** (`/app/ecg`)
2. Create a pair code (advanced / desktop path) or use credentials from a prior claim
3. Run:

```bash
python tools/ecg-agent/agent.py --api http://127.0.0.1:8080 --code XXXXXX
```

Credentials are stored in `~/.inlab-ecg-agent.json`. Later runs:

```bash
python tools/ecg-agent/agent.py --api http://127.0.0.1:8080
```

## Notes

- USB-C on the device is charge-only; data path is BLE only.
- Do not write to service `ae00` (Jieli OTA).
- Connect/bind works; live frames are **20-byte** notifies (`uint16BE seq` + 9×`uint16BE` ADC). Decoder maps ADC≈1520 → mV for the chart. Hold electrodes after Connect.

## Optional: WeChat command sniff

Live ECG already streams after notify (CCCD) enable — no vendor start write required for the chart. Sniff WeChat only if you need extra commands (e.g. lead mode, report metadata).

### Best path — Android HCI snoop

1. Phone: **Developer options → Enable Bluetooth HCI snoop log**
2. Toggle Bluetooth off/on
3. Disconnect InLab / PC from AIECG (only one client)
4. WeChat → scan device QR → mini program → **开始采集** (thumbs or chest electrode) for ~30s
5. Pull the log:

```bash
adb bugreport bugreport.zip
```

6. Open in **Wireshark** → filter `btatt`
7. Find writes to handles for UUID `0xae01` / `0xae03` around “start”
8. Send those hex blobs here (or drop the `.log` / filtered packets) — we’ll wire them into `agent.py` + Web Bluetooth

### Alternate — automated probe (this PC)

With AIECG powered and **not** connected in Chrome/WeChat:

```bash
python tools/ecg-agent/reverse_probe.py
```

Tries hundreds of `ae01`/`ae03`/`ae10`/… candidates and prints `HIT` if any write triggers multi-sample notifies. So far only short ACKs have been observed.
