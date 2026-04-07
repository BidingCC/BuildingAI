"use client";

import { useI18n } from "@buildingai/i18n";
import { Button } from "@buildingai/ui/components/ui/button";
import { Spinner } from "@buildingai/ui/components/ui/spinner";
import { cn } from "@buildingai/ui/lib/utils";
import { Check, Mic, X } from "lucide-react";
import type { RefObject } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

const BAR_COUNT = 12;
const HISTORY_LEN = 16;
const SILENCE_THRESHOLD = 0.015;
const CAPSULE_MIN_WIDTH = 140;

function playBeep(kind: "start" | "end") {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = kind === "start" ? 880 : 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* ignore */
  }
}

export interface VoiceInputProps {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onAudioRecorded: (blob: Blob) => Promise<string | void>;
  onRecordingChange?: (recording: boolean) => void;
  onTranscriptReceived?: (text: string) => void;
  className?: string;
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const buf = await blob.arrayBuffer();
  const audio = await ctx.decodeAudioData(buf.slice(0));
  const sampleRate = audio.sampleRate;
  const channels = audio.numberOfChannels;
  const len = audio.length * channels * 2;
  const wav = new ArrayBuffer(44 + len);
  const view = new DataView(wav);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len, true);
  const left = audio.getChannelData(0);
  const right = channels > 1 ? audio.getChannelData(1) : null;
  let off = 44;
  for (let i = 0; i < audio.length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    off += 2;
    if (right) {
      const r = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(off, r < 0 ? r * 0x8000 : r * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([wav], { type: "audio/wav" });
}

function useWaveformCanvas(
  stream: MediaStream | null,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
) {
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const dataRef = useRef(new Uint8Array(256));
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    if (!stream || !active || !canvasRef.current) return () => {};

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    dataRef.current = data;
    historyRef.current = [];

    const dpr = window.devicePixelRatio ?? 1;
    let width = 0;
    let height = 0;

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;
      const el = canvasRef.current;
      const parent = el.parentElement;
      if (!parent) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const rect = parent.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w !== width || h !== height) {
        width = w;
        height = h;
        const bufferW = Math.round(w * dpr);
        const bufferH = Math.round(h * dpr);
        el.width = bufferW;
        el.height = bufferH;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
      }
      if (w <= 0 || h <= 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      analyserRef.current.getByteFrequencyData(data);
      const bucketSize = Math.floor(data.length / BAR_COUNT);
      let sum = 0;
      for (let i = 0; i < BAR_COUNT; i++) {
        let s = 0;
        for (let j = 0; j < bucketSize; j++) s += data[i * bucketSize + j];
        sum += s / bucketSize / 255;
      }
      const avg = sum / BAR_COUNT;
      const silent = avg < SILENCE_THRESHOLD;

      const history = historyRef.current;
      history.push(avg);
      if (history.length > HISTORY_LEN) history.shift();

      const g = el.getContext("2d", { willReadFrequently: false });
      if (!g) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      if (history.length === 0) {
        rafRef.current = requestAnimationFrame(draw);
        g.setTransform(1, 0, 0, 1, 0, 0);
        return;
      }

      if (silent && history.every((v) => v < SILENCE_THRESHOLD)) {
        g.strokeStyle = "rgba(128,128,128,0.4)";
        g.setLineDash([4, 4]);
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, h / 2);
        g.lineTo(w, h / 2);
        g.stroke();
        g.setLineDash([]);
      } else {
        const colWidth = w / HISTORY_LEN;
        const maxBarH = h * 0.85;
        g.fillStyle = "rgba(100,100,100,0.65)";
        const baseX = w - history.length * colWidth;
        for (let t = 0; t < history.length; t++) {
          const v = Math.min(1, history[t] * 2.2);
          const barH = Math.max(2, v * maxBarH * 0.85 + maxBarH * 0.08);
          const x = baseX + t * colWidth;
          const y = (h - barH) / 2;
          g.beginPath();
          g.roundRect(x, y, Math.max(1, colWidth - 1), barH, 2);
          g.fill();
        }
      }

      g.setTransform(1, 0, 0, 1, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ctx.close();
      analyserRef.current = null;
      ctxRef.current = null;
      historyRef.current = [];
    };
  }, [stream, active, canvasRef]);
}

const VoiceInputInner = memo(function VoiceInputInner({
  textareaRef,
  onAudioRecorded,
  onRecordingChange,
  onTranscriptReceived,
  className,
}: VoiceInputProps) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const confirmRef = useRef(false);
  const onAudioRecordedRef = useRef(onAudioRecorded);
  const onRecordingChangeRef = useRef(onRecordingChange);
  const onTranscriptReceivedRef = useRef(onTranscriptReceived);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isRecordingRef = useRef(false);
  onAudioRecordedRef.current = onAudioRecorded;
  onRecordingChangeRef.current = onRecordingChange;
  onTranscriptReceivedRef.current = onTranscriptReceived;
  streamRef.current = stream;
  isRecordingRef.current = isRecording;

  useEffect(() => {
    onRecordingChangeRef.current?.(isRecording || isProcessing);
  }, [isRecording, isProcessing]);

  useWaveformCanvas(stream, canvasRef, isRecording && !isProcessing);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStream(null);
    },
    [],
  );

  const applyTranscriptToTextarea = useCallback(
    (text: string) => {
      if (!text.trim() || !textareaRef?.current) return;
      const ta = textareaRef.current;
      const cur = ta.value;
      ta.value = cur ? `${cur} ${text.trim()}` : text.trim();
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [textareaRef],
  );

  const startRecording = useCallback(() => {
    setIsRecording(true);
    onRecordingChangeRef.current?.(true);
    playBeep("start");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        if (!isRecordingRef.current) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(mediaStream);
        const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const recorder = new MediaRecorder(mediaStream, { mimeType: mime });
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          mediaStream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setStream(null);
          const shouldSubmit = confirmRef.current;
          confirmRef.current = false;
          if (!shouldSubmit) return;
          const raw = new Blob(chunksRef.current, { type: mime });
          if (raw.size === 0 || !onAudioRecordedRef.current) return;
          try {
            const blob = mime === "audio/webm" || mime === "audio/mp4" ? await blobToWav(raw) : raw;
            const text = await onAudioRecordedRef.current(blob);
            const cb = onTranscriptReceivedRef.current;
            const value = (text ?? "").trim();
            if (cb) cb(value);
            else if (value) applyTranscriptToTextarea(value);
          } catch {
            onTranscriptReceivedRef.current?.("");
          } finally {
            setIsRecording(false);
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start();
      })
      .catch(() => {
        setStream(null);
        setIsRecording(false);
        onRecordingChangeRef.current?.(false);
      });
  }, [applyTranscriptToTextarea]);

  const handleCancel = useCallback(() => {
    playBeep("end");
    confirmRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setIsRecording(false);
  }, []);

  const handleConfirm = useCallback(() => {
    playBeep("end");
    confirmRef.current = true;
    setIsProcessing(true);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);

  const canUse =
    typeof window !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder === "function";
  const disabled = !canUse || isProcessing;

  const showWaveform = isRecording && !isProcessing && !!stream;

  if (isRecording) {
    return (
      <div
        className={cn(
          "border-border mb-1 flex min-w-0 flex-1 items-center rounded-full border px-0.5 py-[2px] shadow-sm",
          "animate-in slide-in-from-right-4 fade-in-0 duration-200 ease-out",
          className,
        )}
        style={{ minWidth: CAPSULE_MIN_WIDTH }}
      >
        <div className="relative mr-1 ml-2 flex h-5 min-w-0 flex-1 items-center overflow-hidden rounded-full px-2">
          {showWaveform ? (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
              style={{ width: "100%", height: "100%", imageRendering: "crisp-edges" }}
            />
          ) : (
            <span className="text-muted-foreground text-xs">{t("ai:askAssistant.voiceInput.connecting")}</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-full"
          onClick={handleCancel}
          aria-label={t("ai:askAssistant.voiceInput.cancel")}
        >
          <X className="size-3.5" strokeWidth={2.25} />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          className="size-7 rounded-full"
          onClick={handleConfirm}
          disabled={isProcessing}
          aria-label={t("ai:askAssistant.voiceInput.confirm")}
          loading={isProcessing}
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      className={cn("rounded-full", className)}
      disabled={disabled}
      onClick={startRecording}
      loading={isProcessing}
      aria-label={t("ai:askAssistant.voiceInput.voiceInput")}
    >
      <Mic className="size-4" strokeWidth={2} />
    </Button>
  );
});

export const VoiceInput = memo(function VoiceInput(props: VoiceInputProps) {
  return <VoiceInputInner {...props} />;
});
