// /dzib — alertas para el personal (cocina, meseros, caja).
// Cuando el polling (5 s) detecta un evento NUEVO — nueva orden, platillo
// listo, cambio listo, llamada a cocina, cuenta pedida — la pantalla:
//  1) vibra el dispositivo (navigator.vibrate; solo Android/Chrome),
//  2) suena un bip con Web Audio (sin archivos externos),
//  3) muestra un banner parpadeante que no se quita hasta pulsar
//     "Entendido".
// El sonido y la vibración exigen un gesto previo del usuario en muchos
// navegadores: por eso cada pantalla tiene un botón "Activar alertas"
// que desbloquea el audio con un toque y guarda la preferencia en
// localStorage. En iPhone no hay vibración desde web: ahí solo suena el
// bip y se ve el banner.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "comanda-alertas-activas";
const VIBRATE_PATTERN = [200, 100, 200, 100, 200];

let audioCtx: AudioContext | null = null;
function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const now = audioCtx.currentTime;
    // Tres bips: dos agudos y uno más agudo al final.
    [0, 0.28, 0.56].forEach((delay, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = i === 2 ? 1175 : 880;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    });
  } catch {
    // Sin audio disponible: el banner visual sigue funcionando.
  }
}

function vibrate() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(VIBRATE_PATTERN);
    }
  } catch {
    // iOS y escritorio no vibran: no pasa nada.
  }
}

export type StaffEvent = { key: string; text: string };

export function useStaffAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const firstRef = useRef(true);
  const enabledRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") {
        enabledRef.current = true;
        setEnabled(true);
      }
    } catch {
      // Sin localStorage: las alertas se activan solo por sesión.
    }
  }, []);

  const enable = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignorar */ }
    enabledRef.current = true;
    setEnabled(true);
    beep();
    vibrate();
  }, []);

  // Llamar en cada polling con la lista ACTUAL de eventos. Solo los
  // eventos que aparecen por primera vez disparan vibración, bip y
  // banner. En la primera carga no suena nada (los pendientes viejos no
  // son eventos nuevos).
  const notify = useCallback((events: StaffEvent[]) => {
    const current = new Set(events.map((e) => e.key));
    const fresh = events.filter((e) => !seenRef.current.has(e.key));
    seenRef.current = current;
    if (firstRef.current) { firstRef.current = false; return; }
    if (fresh.length > 0) {
      setBanner(fresh[fresh.length - 1].text);
      if (enabledRef.current) { beep(); vibrate(); }
    }
  }, []);

  return { enabled, enable, banner, setBanner, notify };
}

export function StaffAlertUI({ alerts }: { alerts: ReturnType<typeof useStaffAlerts> }) {
  return (
    <>
      {!alerts.enabled ? (
        <button type="button" className="alert-enable" onClick={alerts.enable}>
          🔔 Activar alertas (sonido y vibración)
        </button>
      ) : (
        <p className="muted">🔔 Alertas activas: sonido y vibración cuando llegue un pedido o algo esté listo. En iPhone no vibra: solo suena y se ve el aviso.</p>
      )}
      {alerts.banner && (
        <div className="alert-banner" role="alert">
          <span>🔔 {alerts.banner}</span>
          <button type="button" onClick={() => alerts.setBanner(null)}>Entendido</button>
        </div>
      )}
    </>
  );
}
